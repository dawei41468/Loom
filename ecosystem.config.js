module.exports = {
  apps : [{
    name: "loom-backend",
    script: "/home/ubuntu/Loom/backend/venv/bin/gunicorn",
    args: "-k uvicorn.workers.UvicornWorker --workers 4 --bind 127.0.0.1:4100 --timeout 120 app.main:app",
    cwd: "/home/ubuntu/Loom/backend",
    interpreter: "none",
    env: {
      "APP_ENV": "production",
      "PYTHONPATH": "/home/ubuntu/Loom/backend"
    }
  }]
}