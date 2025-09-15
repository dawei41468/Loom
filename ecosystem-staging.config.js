module.exports = {
  apps : [{
    name: "loom-backend-staging",
    script: "/home/ubuntu/Loom-staging/backend/venv/bin/gunicorn",
    args: "-k uvicorn.workers.UvicornWorker --workers 4 --bind 127.0.0.1:4200 --timeout 120 app.main:app",
    cwd: "/home/ubuntu/Loom-staging/backend",
    interpreter: "none",
    env: {
      "APP_ENV": "staging",
      "PYTHONPATH": "/home/ubuntu/Loom-staging/backend"
    }
  }]
}