"""
Chat Service
Keyword-based intent parsing for the dashboard chatbot.
Parses natural language queries to identify what the user wants to do.
"""

import re
from datetime import datetime, timedelta
from dateutil import parser as date_parser


# Feature name mapping for flexible matching
FEATURE_MAP = {
    'threat': 'threat-model',
    'threat model': 'threat-model',
    'threat-model': 'threat-model',
    'vulnerability': 'vulnerability-discovery',
    'vuln': 'vulnerability-discovery',
    'vulnerability discovery': 'vulnerability-discovery',
    'vulnerability-discovery': 'vulnerability-discovery',
    'sql': 'prompt-sql-injection',
    'sql injection': 'prompt-sql-injection',
    'prompt sql': 'prompt-sql-injection',
    'prompt-sql-injection': 'prompt-sql-injection',
    'injection': 'prompt-sql-injection',
    'hallucination': 'hallucination-checks',
    'hallucination checks': 'hallucination-checks',
    'hallucination-checks': 'hallucination-checks',
    'adversarial': 'hallucination-checks',
}

FEATURE_DISPLAY = {
    'threat-model': 'Threat Model',
    'vulnerability-discovery': 'Vulnerability Discovery',
    'prompt-sql-injection': 'Prompt SQL Injection',
    'hallucination-checks': 'Hallucination Checks',
}


def parse_intent(message):
    """
    Parse the user's chat message and return an intent dict.

    Returns:
        {
            'action': str,       # 'list_reports', 'generate', 'help', 'greeting', 'unknown'
            'feature': str|None, # Feature type filter
            'from_date': datetime|None,
            'to_date': datetime|None,
            'limit': int,
        }
    """
    msg = message.lower().strip()

    intent = {
        'action': 'unknown',
        'feature': None,
        'from_date': None,
        'to_date': None,
        'limit': 20,
    }

    # --- Greeting ---
    greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
    if msg in greetings or msg.startswith(('hi ', 'hello ', 'hey ')):
        intent['action'] = 'greeting'
        return intent

    # --- Help ---
    if msg in ['help', 'what can you do', 'commands', 'how to use']:
        intent['action'] = 'help'
        return intent

    # --- Detect Feature ---
    for keyword, feature_id in sorted(FEATURE_MAP.items(), key=lambda x: -len(x[0])):
        if keyword in msg:
            intent['feature'] = feature_id
            break

    # --- Detect Date Filters ---
    # "today"
    if 'today' in msg:
        intent['from_date'] = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        intent['to_date'] = datetime.utcnow()

    # "yesterday"
    elif 'yesterday' in msg:
        yesterday = datetime.utcnow() - timedelta(days=1)
        intent['from_date'] = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        intent['to_date'] = yesterday.replace(hour=23, minute=59, second=59)

    # "last week"
    elif 'last week' in msg or 'past week' in msg:
        intent['from_date'] = datetime.utcnow() - timedelta(days=7)
        intent['to_date'] = datetime.utcnow()

    # "last month"
    elif 'last month' in msg or 'past month' in msg:
        intent['from_date'] = datetime.utcnow() - timedelta(days=30)
        intent['to_date'] = datetime.utcnow()

    # "from <date>" pattern
    else:
        date_match = re.search(r'from\s+(.+?)(?:\s+to\s+(.+))?$', msg)
        if date_match:
            try:
                intent['from_date'] = date_parser.parse(date_match.group(1), fuzzy=True)
                if date_match.group(2):
                    intent['to_date'] = date_parser.parse(date_match.group(2), fuzzy=True)
            except (ValueError, TypeError):
                pass

    # --- Detect Action ---
    if any(w in msg for w in ['generate', 'create', 'run', 'new report', 'run analysis']):
        intent['action'] = 'generate'
    elif any(w in msg for w in ['show', 'list', 'get', 'find', 'all reports', 'reports',
                                 'latest', 'recent', 'last report', 'history']):
        intent['action'] = 'list_reports'
    elif any(w in msg for w in ['count', 'how many', 'total']):
        intent['action'] = 'count_reports'

    # If we detected a feature but no explicit action, assume list
    if intent['action'] == 'unknown' and intent['feature']:
        intent['action'] = 'list_reports'

    # "latest" should limit to 1
    if 'latest' in msg or 'last report' in msg:
        intent['limit'] = 1

    return intent


def build_reply(intent, reports=None, count=None):
    """Build a natural language reply based on the intent and results."""

    if intent['action'] == 'greeting':
        return "Hello! 👋 I'm here to help you with your security reports. You can ask me to show reports, filter by date, or generate new ones. What would you like to do?"

    if intent['action'] == 'help':
        return (
            "Here's what I can do:\n\n"
            "📋 **List reports** — \"Show all reports\", \"List threat model reports\"\n"
            "📅 **Filter by date** — \"Reports from today\", \"Reports from last week\"\n"
            "🔍 **Search by feature** — \"Latest vulnerability report\", \"Hallucination checks from yesterday\"\n"
            "📊 **Count reports** — \"How many reports?\", \"Total threat model reports\"\n\n"
            "Try asking something like \"Show me the latest threat model report\"!"
        )

    feature_name = FEATURE_DISPLAY.get(intent.get('feature'), 'all features')

    if intent['action'] == 'list_reports':
        if reports is None:
            return "I couldn't find any reports. Try generating one first!"
        if len(reports) == 0:
            date_info = ""
            if intent.get('from_date'):
                date_info = f" for the selected date range"
            return f"No reports found for {feature_name}{date_info}. You can generate a new one from the dashboard."

        count_str = f"{len(reports)} report{'s' if len(reports) != 1 else ''}"
        return f"Found {count_str} for {feature_name}:"

    if intent['action'] == 'count_reports':
        c = count or 0
        return f"There are {c} report{'s' if c != 1 else ''} for {feature_name}."

    if intent['action'] == 'generate':
        if intent.get('feature'):
            return f"To generate a {feature_name} report, click the {feature_name} card on the dashboard and hit 'Generate Report'."
        return "To generate a report, click on any of the 4 feature cards on the dashboard and hit 'Generate Report'."

    return "I'm not sure what you're looking for. Try asking me to \"show all reports\" or \"list threat model reports from today\". Type \"help\" for more options!"
