"""
Telemetry & LLM Token Monitoring Module
Conforms to Azure LLM Token Monitoring Standard Specifications.
"""

import json
import logging
import time
import uuid
import threading
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Active thread-local usage context tracker
_thread_local = threading.local()
_global_active_context: Optional[Dict[str, Any]] = None


def create_usage_context(request_id: Optional[str] = None, api_name: str = "PromptSQLInjection") -> Dict[str, Any]:
    """
    Creates one usage-tracking context object for an API request or batch run.
    """
    global _global_active_context
    ctx = {
        "request_id": request_id or str(uuid.uuid4()),
        "api_name": api_name,
        "start_time": time.time(),
        "total_llm_calls": 0,
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_tokens": 0,
        "total_llm_latency_sec": 0.0,
        "model_usage_by_model": {},
    }
    _thread_local.active_context = ctx
    _global_active_context = ctx
    return ctx


def get_active_usage_context() -> Optional[Dict[str, Any]]:
    """Retrieves current thread or global active usage context."""
    return getattr(_thread_local, "active_context", None) or _global_active_context


def _accumulate_usage(
    usage_context: Dict[str, Any],
    *,
    model: str = "gpt-5.4",
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
    latency_sec: float = 0.0,
    usage_lock: Optional[Any] = None,
    **kwargs
) -> None:
    """Add one LLM call's usage into the shared usage context."""
    if not usage_context or not isinstance(usage_context, dict):
        return

    fake_response = {
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens or (prompt_tokens + completion_tokens),
        }
    }
    accumulate_usage_sync(
        usage_context=usage_context,
        model=model,
        response=fake_response,
        latency_sec=latency_sec,
        usage_lock=usage_lock,
    )


def accumulate_usage_sync(
    usage_context: Optional[Dict[str, Any]] = None,
    model: str = "gpt-5.4",
    response: Any = None,
    latency_sec: float = 0.0,
    usage_lock: Optional[Any] = None,
    **kwargs
) -> None:
    """
    Accumulates usage metrics from a synchronous LLM call into usage_context.
    Supports flexible positional/keyword parameter patterns.
    """
    # If usage_context is passed as dict vs string model
    if isinstance(usage_context, str):
        # Called as accumulate_usage_sync(model, response, latency_sec)
        model, response, latency_sec = usage_context, model, (response if isinstance(response, (int, float)) else latency_sec)
        usage_context = get_active_usage_context()
    elif usage_context is None:
        usage_context = get_active_usage_context()

    if not usage_context or not isinstance(usage_context, dict):
        return

    usage = getattr(response, "usage", None)
    if usage is None and isinstance(response, dict):
        usage = response.get("usage")

    if usage:
        if isinstance(usage, dict):
            prompt_tokens = usage.get("prompt_tokens", 0) or 0
            completion_tokens = usage.get("completion_tokens", 0) or 0
            total_tokens = usage.get("total_tokens", 0) or (prompt_tokens + completion_tokens)
        else:
            prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
            completion_tokens = getattr(usage, "completion_tokens", 0) or 0
            total_tokens = getattr(usage, "total_tokens", 0) or (prompt_tokens + completion_tokens)
    else:
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0

    latency_sec = round(float(latency_sec or 0.0), 3)

    def _update():
        usage_context["total_llm_calls"] += 1
        usage_context["total_prompt_tokens"] += prompt_tokens
        usage_context["total_completion_tokens"] += completion_tokens
        usage_context["total_tokens"] += total_tokens
        usage_context["total_llm_latency_sec"] = round(usage_context["total_llm_latency_sec"] + latency_sec, 3)

        model_dict = usage_context["model_usage_by_model"]
        m_name = str(model or "gpt-5.4")
        if m_name not in model_dict:
            model_dict[m_name] = {
                "calls": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "latency_sec": 0.0,
            }

        m_stats = model_dict[m_name]
        m_stats["calls"] += 1
        m_stats["prompt_tokens"] += prompt_tokens
        m_stats["completion_tokens"] += completion_tokens
        m_stats["total_tokens"] += total_tokens
        m_stats["latency_sec"] = round(m_stats["latency_sec"] + latency_sec, 3)

    if usage_lock:
        with usage_lock:
            _update()
    else:
        _update()


def log_llm_usage_summary(
    usage_context: Optional[Dict[str, Any]] = None,
    status: str = "Success",
    overall_api_latency_sec: float = 0.0,
) -> Dict[str, Any]:
    """
    Logs structured JSON summary log of token usage grouped model-wise.
    """
    if usage_context is None:
        usage_context = get_active_usage_context()

    if not usage_context or not isinstance(usage_context, dict):
        return {}

    if not overall_api_latency_sec and "start_time" in usage_context:
        overall_api_latency_sec = round(time.time() - usage_context["start_time"], 3)
    else:
        overall_api_latency_sec = round(float(overall_api_latency_sec), 3)

    summary = {
        "event": "llm.usage.summary",
        "api_name": usage_context.get("api_name", "PromptSQLInjection"),
        "request_id": usage_context.get("request_id", ""),
        "status": status,
        "total_llm_calls": usage_context.get("total_llm_calls", 0),
        "total_prompt_tokens": usage_context.get("total_prompt_tokens", 0),
        "total_completion_tokens": usage_context.get("total_completion_tokens", 0),
        "total_tokens": usage_context.get("total_tokens", 0),
        "total_llm_latency_sec": round(usage_context.get("total_llm_latency_sec", 0.0), 3),
        "overall_api_latency_sec": overall_api_latency_sec,
        "model_usage_by_model": usage_context.get("model_usage_by_model", {}),
    }

    logger.info("LLM Token Usage Summary Log: %s", json.dumps(summary))
    return summary
