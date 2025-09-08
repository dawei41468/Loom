# Loom Backend

FastAPI + MongoDB backend for Loom.

## Run
```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Use the development env file
cp .env.example .env.development

# Start FastAPI on port 7500 to match the frontend default
uvicorn app.main:app --reload --port 7500
```
