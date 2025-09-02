from fastapi import FastAPI

app = FastAPI(title="Loom")

@app.get("/health")
async def health():
    return {"ok": True}
