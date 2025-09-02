# Loom — Local Development Guide

This guide explains how to run the Loom backend (FastAPI + MongoDB) locally alongside the Lovable-generated frontend.

## Quick Start

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # update secrets
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/api/docs for API docs.
