import os
import json
import queue
import tempfile
import threading
import uuid
import pandas as pd
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request, send_file, Response, stream_with_context
from bson import ObjectId
from app import get_db
from app.models.report import Report
from app.services.report_generator import _env, _risk_color, _risk_level
from app.services.prompt_injection_engine import run_prompt_sql_injection_assessment

sql_injection_bp = Blueprint('sql_injection', __name__)

TEMP_REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'temp_reports')
os.makedirs(TEMP_REPORTS_DIR, exist_ok=True)


def _process_generate_params(req):
    api_doc_path = None
    sop_folder_path = None
    synth_count = 5
    temp_dir = tempfile.mkdtemp(prefix="prompt_inj_")

    if req.files:
        if 'api_doc' in req.files and req.files['api_doc'].filename:
            file = req.files['api_doc']
            api_doc_path = os.path.join(temp_dir, file.filename)
            file.save(api_doc_path)
            
        sop_files = req.files.getlist('sop_files') or req.files.getlist('sop_files[]')
        if sop_files and any(f.filename for f in sop_files):
            sop_folder = os.path.join(temp_dir, 'sop_docs')
            os.makedirs(sop_folder, exist_ok=True)
            for f in sop_files:
                if f.filename:
                    relative_path = f.filename.replace('\\', '/')
                    dest_path = os.path.join(sop_folder, relative_path)
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    f.save(dest_path)
            sop_folder_path = sop_folder

    if req.form:
        if req.form.get('rows'):
            try:
                synth_count = int(req.form.get('rows'))
            except ValueError:
                pass
        if not api_doc_path and req.form.get('api_doc_path'):
            api_doc_path = req.form.get('api_doc_path')
        if not sop_folder_path and req.form.get('sop_folder_path'):
            sop_folder_path = req.form.get('sop_folder_path')
    elif req.is_json:
        data_json = req.get_json() or {}
        if data_json.get('rows'):
            try:
                synth_count = int(data_json.get('rows'))
            except ValueError:
                pass
        if data_json.get('api_doc_path'):
            api_doc_path = data_json.get('api_doc_path')
        if data_json.get('sop_folder_path'):
            sop_folder_path = data_json.get('sop_folder_path')

    return api_doc_path, sop_folder_path, synth_count, temp_dir


@sql_injection_bp.route('/generate', methods=['POST'])
def generate():
    """Generate a Prompt SQL Injection security report using Arya engine."""
    api_doc_path, sop_folder_path, synth_count, temp_dir = _process_generate_params(request)
    excel_filename = f"ATE_Report_{int(datetime.utcnow().timestamp())}.xlsx"
    excel_path = os.path.join(TEMP_REPORTS_DIR, excel_filename)

    data = run_prompt_sql_injection_assessment(
        api_doc_path=api_doc_path,
        sop_folder_path=sop_folder_path,
        synth_count=synth_count,
        output_excel_path=excel_path,
    )
    data['excel_filename'] = excel_filename

    IST = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(IST)

    template = _env.get_template('report_template.html')
    html_content = template.render(
        feature_type='prompt-sql-injection',
        title=data['title'],
        generated_at=now_ist.strftime('%d %B %Y, %H:%M IST'),
        data=data,
        risk_color=_risk_color,
        risk_level=_risk_level,
    )

    summary = f"{data['title']} — Passed: {data.get('passed_count', 0)}/{data.get('total_rows', 0)} ({data.get('pass_ratio', '0%')})"

    db = get_db()
    report_doc = Report.create(
        feature_type='prompt-sql-injection',
        title=data['title'],
        data=data,
        html_content=html_content,
        summary=summary,
    )
    report_doc['excel_path'] = excel_path

    if db is not None:
        try:
            result = db.reports.insert_one(report_doc)
            report_id = str(result.inserted_id)
        except Exception:
            report_id = f"local-{int(datetime.now(IST).timestamp())}"
    else:
        report_id = f"local-{int(datetime.now(IST).timestamp())}"

    return jsonify({
        'report_id': report_id,
        'html_content': html_content,
        'summary': summary,
        'title': data['title'],
        'excel_available': True,
    }), 201


@sql_injection_bp.route('/generate-stream', methods=['POST'])
def generate_stream():
    """Stream real-time progress events as test cases execute."""
    api_doc_path, sop_folder_path, synth_count, temp_dir = _process_generate_params(request)
    excel_filename = f"ATE_Report_{int(datetime.utcnow().timestamp())}.xlsx"
    excel_path = os.path.join(TEMP_REPORTS_DIR, excel_filename)

    def generate_events():
        event_queue = queue.Queue()

        def progress_cb(info):
            event_queue.put({"type": "progress", "data": info})

        def run_worker():
            try:
                data = run_prompt_sql_injection_assessment(
                    api_doc_path=api_doc_path,
                    sop_folder_path=sop_folder_path,
                    synth_count=synth_count,
                    output_excel_path=excel_path,
                    progress_callback=progress_cb,
                )
                data['excel_filename'] = excel_filename

                IST = timezone(timedelta(hours=5, minutes=30))
                now_ist = datetime.now(IST)

                template = _env.get_template('report_template.html')
                html_content = template.render(
                    feature_type='prompt-sql-injection',
                    title=data['title'],
                    generated_at=now_ist.strftime('%d %B %Y, %H:%M IST'),
                    data=data,
                    risk_color=_risk_color,
                    risk_level=_risk_level,
                )

                summary = f"{data['title']} — Passed: {data.get('passed_count', 0)}/{data.get('total_rows', 0)} ({data.get('pass_ratio', '0%')})"

                db = get_db()
                report_doc = Report.create(
                    feature_type='prompt-sql-injection',
                    title=data['title'],
                    data=data,
                    html_content=html_content,
                    summary=summary,
                )
                report_doc['excel_path'] = excel_path

                if db is not None:
                    try:
                        result = db.reports.insert_one(report_doc)
                        report_id = str(result.inserted_id)
                    except Exception:
                        report_id = f"local-{int(datetime.now(IST).timestamp())}"
                else:
                    report_id = f"local-{int(datetime.now(IST).timestamp())}"

                event_queue.put({
                    "type": "result",
                    "data": {
                        'report_id': report_id,
                        'html_content': html_content,
                        'summary': summary,
                        'title': data['title'],
                        'excel_available': True,
                    }
                })
            except Exception as e:
                event_queue.put({"type": "error", "error": str(e)})

        worker_thread = threading.Thread(target=run_worker)
        worker_thread.start()

        while True:
            try:
                msg = event_queue.get(timeout=180)
                yield f"data: {json.dumps(msg)}\n\n"
                if msg.get("type") in ("result", "error"):
                    break
            except queue.Empty:
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"

    return Response(stream_with_context(generate_events()), mimetype='text/event-stream')



@sql_injection_bp.route('/download-excel/<report_id>', methods=['GET'])
def download_excel(report_id):
    """Download consolidated Excel report workbook (ATE_Report.xlsx)."""
    db = get_db()
    excel_path = None

    if db is not None and len(report_id) == 24:
        try:
            doc = db.reports.find_one({'_id': ObjectId(report_id)})
            if doc and doc.get('excel_path') and os.path.exists(doc.get('excel_path')):
                excel_path = doc.get('excel_path')
            elif doc and doc.get('data') and doc['data'].get('tests'):
                # Re-generate excel file on the fly if needed
                excel_path = os.path.join(TEMP_REPORTS_DIR, f"ATE_Report_{report_id}.xlsx")
                test_results = doc['data']['tests']
                with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
                    df = pd.DataFrame([
                        {
                            "Test ID": r.get("id"),
                            "Prompt": r.get("payload"),
                            "Expected Output": r.get("expected_output", "N/A"),
                            "API Response": r.get("api_response", "N/A"),
                            "Comparison Result": r.get("verdict", "N/A"),
                            "Result Status": r.get("result", "N/A"),
                            "Comparison Reason": r.get("details", "N/A"),
                            "Severity": r.get("severity", 0),
                        }
                        for r in test_results
                    ])
                    df.to_excel(writer, sheet_name="Results", index=False)
        except Exception as e:
            pass

    if not excel_path or not os.path.exists(excel_path):
        # Fallback to latest file in TEMP_REPORTS_DIR
        files = [os.path.join(TEMP_REPORTS_DIR, f) for f in os.listdir(TEMP_REPORTS_DIR) if f.endswith('.xlsx')]
        if files:
            files.sort(key=os.path.getmtime, reverse=True)
            excel_path = files[0]

    if excel_path and os.path.exists(excel_path):
        return send_file(
            excel_path,
            as_attachment=True,
            download_name="ATE_Report.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    return jsonify({'error': 'Excel report file not found'}), 404


@sql_injection_bp.route('/reports', methods=['GET'])
def list_reports():
    """List past Prompt SQL Injection reports."""
    db = get_db()
    if db is None:
        return jsonify({'reports': []})

    reports = db.reports.find(
        {'feature_type': 'prompt-sql-injection'},
        {'html_content': 0, 'data': 0}
    ).sort('generated_at', -1).limit(50)

    return jsonify({
        'reports': [Report.to_summary(r) for r in reports]
    })
