from flask import Blueprint, jsonify, request
from app import get_db
from app.models.report import Report
from app.services.chat_service import parse_intent, build_reply

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('', methods=['POST'])
def chat():
    """
    Process a chat message.
    Input: { "message": str }
    Output: { "reply": str, "reports": [...] | null, "action": str }
    """
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Message is required'}), 400

    message = data['message']
    intent = parse_intent(message)
    db = get_db()

    reports = None
    count = None

    if intent['action'] in ('list_reports', 'count_reports'):
        query = {}

        # Feature filter
        if intent.get('feature'):
            query['feature_type'] = intent['feature']

        # Date filter
        if intent.get('from_date') or intent.get('to_date'):
            query['generated_at'] = {}
            if intent.get('from_date'):
                query['generated_at']['$gte'] = intent['from_date']
            if intent.get('to_date'):
                query['generated_at']['$lte'] = intent['to_date']
            if not query['generated_at']:
                del query['generated_at']

        if intent['action'] == 'count_reports':
            count = db.reports.count_documents(query)
        else:
            cursor = db.reports.find(
                query,
                {'html_content': 0, 'data': 0}
            ).sort('generated_at', -1).limit(intent.get('limit', 20))
            reports = [Report.to_summary(r) for r in cursor]

    reply = build_reply(intent, reports=reports, count=count)

    # Store chat in history
    from datetime import datetime
    db.chat_history.insert_one({
        'user_message': message,
        'bot_reply': reply,
        'intent': {
            'action': intent['action'],
            'feature': intent.get('feature'),
        },
        'timestamp': datetime.utcnow(),
    })

    return jsonify({
        'reply': reply,
        'reports': reports,
        'action': intent['action'],
    })
