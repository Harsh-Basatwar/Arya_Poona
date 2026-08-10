from flask import Blueprint, jsonify
from app import get_db
from app.models.report import Report
from app.services.report_generator import generate_report

threat_model_bp = Blueprint('threat_model', __name__)


@threat_model_bp.route('/generate', methods=['POST'])
def generate():
    """Generate a new Threat Model report."""
    db = get_db()
    data, html_content, summary = generate_report('threat-model')

    report_doc = Report.create(
        feature_type='threat-model',
        title=data['title'],
        data=data,
        html_content=html_content,
        summary=summary,
    )
    result = db.reports.insert_one(report_doc)

    return jsonify({
        'report_id': str(result.inserted_id),
        'html_content': html_content,
        'summary': summary,
        'title': data['title'],
    }), 201


@threat_model_bp.route('/reports', methods=['GET'])
def list_reports():
    """List past Threat Model reports."""
    db = get_db()
    reports = db.reports.find(
        {'feature_type': 'threat-model'},
        {'html_content': 0, 'data': 0}
    ).sort('generated_at', -1).limit(50)

    return jsonify({
        'reports': [Report.to_summary(r) for r in reports]
    })
