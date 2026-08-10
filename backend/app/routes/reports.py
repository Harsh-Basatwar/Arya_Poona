from flask import Blueprint, jsonify, request, Response
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
from dateutil import parser as date_parser

from app import get_db
from app.models.report import Report

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('', methods=['GET'])
def list_reports():
    """
    List all reports, with optional filters.
    Query params: feature, from_date, to_date, limit, sort
    """
    db = get_db()
    query = {}

    # Feature filter
    feature = request.args.get('feature')
    if feature:
        query['feature_type'] = feature

    # Date filters
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')
    if from_date or to_date:
        query['generated_at'] = {}
        if from_date:
            try:
                query['generated_at']['$gte'] = date_parser.parse(from_date)
            except ValueError:
                pass
        if to_date:
            try:
                query['generated_at']['$lte'] = date_parser.parse(to_date)
            except ValueError:
                pass
        if not query['generated_at']:
            del query['generated_at']

    # Limit
    limit = int(request.args.get('limit', 50))

    # Sort
    sort_dir = -1  # newest first by default

    reports = db.reports.find(
        query,
        {'html_content': 0, 'data': 0}
    ).sort('generated_at', sort_dir).limit(limit)

    return jsonify({
        'reports': [Report.to_summary(r) for r in reports]
    })


@reports_bp.route('/<report_id>', methods=['GET'])
def get_report(report_id):
    """Get a single report by ID (with HTML content)."""
    db = get_db()
    try:
        report = db.reports.find_one({'_id': ObjectId(report_id)})
    except InvalidId:
        return jsonify({'error': 'Invalid report ID'}), 400

    if not report:
        return jsonify({'error': 'Report not found'}), 404

    return jsonify(Report.to_json(report))


@reports_bp.route('/<report_id>/pdf', methods=['GET'])
def download_pdf(report_id):
    """Download a report as PDF."""
    db = get_db()
    report = None

    # Try ObjectId lookup first
    if len(report_id) == 24:
        try:
            report = db.reports.find_one({'_id': ObjectId(report_id)})
        except (InvalidId, Exception):
            pass

    # Fallback: search by local-xxx pattern in data or summary
    if not report and report_id.startswith('local-'):
        try:
            # Try to find the most recent report
            report = db.reports.find_one(
                {'feature_type': 'prompt-sql-injection'},
                sort=[('generated_at', -1)]
            )
        except Exception:
            pass

    if not report:
        return jsonify({'error': 'Report not found'}), 404

    html_content = report.get('html_content', '')

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=report_{report_id}.pdf'
            }
        )
    except ImportError:
        # Fallback: return HTML if weasyprint not installed
        return Response(
            html_content,
            mimetype='text/html',
            headers={
                'Content-Disposition': f'attachment; filename=report_{report_id}.html'
            }
        )
    except Exception as e:
        # Return HTML as fallback on any weasyprint error
        return Response(
            html_content,
            mimetype='text/html',
            headers={
                'Content-Disposition': f'attachment; filename=report_{report_id}.html'
            }
        )

