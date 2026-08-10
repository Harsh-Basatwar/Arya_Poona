# pyrefly: ignore [missing-import]
from flask import Blueprint, jsonify
from app import get_db
from app.models.report import Report
from app.services.report_generator import generate_report

hallucination_bp = Blueprint('hallucination', __name__)


@hallucination_bp.route('/generate', methods=['POST'])
def generate():
    """Generate a new Hallucination Checks report."""
    db = get_db()
    data, html_content, summary = generate_report('hallucination-checks')

    report_doc = Report.create(
        feature_type='hallucination-checks',
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


@hallucination_bp.route('/reports', methods=['GET'])
def list_reports():
    """List past Hallucination Checks reports."""
    db = get_db()
    reports = db.reports.find(
        {'feature_type': 'hallucination-checks'},
        {'html_content': 0, 'data': 0}
    ).sort('generated_at', -1).limit(50)

    return jsonify({
        'reports': [Report.to_summary(r) for r in reports]
    })
