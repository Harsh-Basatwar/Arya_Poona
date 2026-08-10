# AI Security & Risk Intelligence Dashboard

A minimal, soothing internal dashboard for generating and viewing AI security reports.

## Features

- **Threat Model** — Identify and analyze potential threats to AI applications
- **Vulnerability Discovery** — Scan and uncover security vulnerabilities
- **Prompt SQL Injection** — Detect SQL injection risks in AI-generated prompts
- **Hallucination Checks** — Adversarial testing, safe data sourcing, robust inference
- **AI Chatbot** — Query reports via natural language (bottom-right corner)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| Backend | Python Flask |
| Database | MongoDB |
| Reports | HTML + PDF (WeasyPrint) |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB running locally on port 27017

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Backend runs at `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (proxies API calls to Flask)

### 3. Open Dashboard

Navigate to `http://localhost:5173` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/threat-model/generate` | Generate threat model report |
| GET | `/api/threat-model/reports` | List threat model reports |
| POST | `/api/vulnerability-discovery/generate` | Generate vulnerability report |
| GET | `/api/vulnerability-discovery/reports` | List vulnerability reports |
| POST | `/api/prompt-sql-injection/generate` | Generate SQL injection report |
| GET | `/api/prompt-sql-injection/reports` | List SQL injection reports |
| POST | `/api/hallucination-checks/generate` | Generate hallucination report |
| GET | `/api/hallucination-checks/reports` | List hallucination reports |
| GET | `/api/reports` | List all reports (filterable) |
| GET | `/api/reports/<id>` | Get single report |
| GET | `/api/reports/<id>/pdf` | Download report as PDF |
| POST | `/api/chat` | Send chat message |

## Project Structure

```
poona_dash/
├── frontend/          # React (Vite) application
│   ├── src/
│   │   ├── components/  # Dashboard, FeatureCard, ReportModal, Chatbot
│   │   ├── styles/      # CSS modules
│   │   ├── services/    # API layer (Axios)
│   │   └── utils/       # Helpers
│   └── ...
├── backend/           # Python Flask API
│   ├── app/
│   │   ├── routes/      # API blueprints
│   │   ├── services/    # Report generator, Chat service
│   │   ├── models/      # MongoDB document schemas
│   │   └── templates/   # Jinja2 HTML report template
│   └── ...
└── README.md
```
