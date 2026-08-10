export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateStr) {
  return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
}

export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateStr);
}

export const FEATURES = [
  {
    id: 'threat-model',
    title: 'Threat Model',
    description: 'Identify and analyze potential threats to your AI applications and data.',
    accent: 'purple',
  },
  {
    id: 'vulnerability-discovery',
    title: 'Vulnerability Discovery',
    description: 'Scan and uncover security vulnerabilities across your AI systems.',
    accent: 'teal',
  },
  {
    id: 'prompt-sql-injection',
    title: 'Prompt SQL Injection',
    description: 'Detect and evaluate SQL injection risks in AI-generated prompts.',
    accent: 'orange',
  },
  {
    id: 'hallucination-checks',
    title: 'Hallucination Checks',
    description: 'Adversarial testing, safe data sourcing, and robust inference protocols.',
    accent: 'blue',
  },
];
