from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from app.config import Config


# Global MongoDB references
mongo_client = None
db = None
_indexes_created = False


def get_db():
    """Get the MongoDB database instance. Creates indexes on first access."""
    global db, _indexes_created
    if not _indexes_created and db is not None:
        try:
            db.reports.create_index([('feature_type', 1), ('generated_at', -1)])
            db.reports.create_index([('generated_at', -1)])
            _indexes_created = True
        except Exception:
            pass  # Will retry on next call
    return db


def create_app():
    """Flask application factory."""
    global mongo_client, db

    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # MongoDB connection (lazy — doesn't connect until first operation)
    mongo_client = MongoClient(
        app.config['MONGO_URI'],
        serverSelectionTimeoutMS=5000,  # 5s timeout instead of 30s
    )
    db = mongo_client[app.config['MONGO_DB']]

    # Register blueprints
    from app.routes.threat_model import threat_model_bp
    from app.routes.vulnerability import vulnerability_bp
    from app.routes.sql_injection import sql_injection_bp
    from app.routes.hallucination import hallucination_bp
    from app.routes.reports import reports_bp
    from app.routes.chat import chat_bp

    app.register_blueprint(threat_model_bp, url_prefix='/api/threat-model')
    app.register_blueprint(vulnerability_bp, url_prefix='/api/vulnerability-discovery')
    app.register_blueprint(sql_injection_bp, url_prefix='/api/prompt-sql-injection')
    app.register_blueprint(hallucination_bp, url_prefix='/api/hallucination-checks')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    # Health check
    @app.route('/api/health')
    def health():
        return {'status': 'ok'}

    return app
