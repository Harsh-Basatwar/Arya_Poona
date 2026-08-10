from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Indian Standard Time offset
IST = timezone(timedelta(hours=5, minutes=30))


class Report:
    """Report document helper for MongoDB."""

    FEATURE_TYPES = [
        'threat-model',
        'vulnerability-discovery',
        'prompt-sql-injection',
        'hallucination-checks',
    ]

    @staticmethod
    def create(feature_type, title, data, html_content, summary):
        """Create a new report document."""
        return {
            'feature_type': feature_type,
            'title': title,
            'generated_at': datetime.now(IST),
            'data': data,
            'html_content': html_content,
            'summary': summary,
        }

    @staticmethod
    def to_json(doc):
        """Convert MongoDB document to JSON-serializable dict."""
        if doc is None:
            return None
        return {
            'report_id': str(doc['_id']),
            'feature_type': doc['feature_type'],
            'title': doc['title'],
            'generated_at': doc['generated_at'].isoformat(),
            'summary': doc.get('summary', ''),
            'html_content': doc.get('html_content', ''),
        }

    @staticmethod
    def to_summary(doc):
        """Convert to a brief summary (no HTML content)."""
        if doc is None:
            return None
        return {
            'report_id': str(doc['_id']),
            'feature_type': doc['feature_type'],
            'title': doc['title'],
            'generated_at': doc['generated_at'].isoformat(),
            'summary': doc.get('summary', ''),
        }
