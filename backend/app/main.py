from fastapi import FastAPI, WebSocket
import logging
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import connect_to_mongo, close_mongo_connection
from .middleware import setup_middleware
from .cache import cache_manager
from .routers import auth, events, tasks, proposals, partner, availability
from . import websocket as ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    await cache_manager.initialize()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    redirect_slashes=False
)

# CORS middleware
logger = logging.getLogger(__name__)
cors_kwargs = dict(
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if getattr(settings, "ENV", "dev") in {"dev", "development"}:
    # In development, allow localhost variants on any port
    cors_kwargs["allow_origin_regex"] = r"^https?://(localhost|127\\.0\\.0\\.1|\\[::1\\]):\\d+$"
    logger.info(
        "ENV=%s - CORS enabled for development with origins: %s and regex: %s",
        getattr(settings, "ENV", "dev"),
        settings.CORS_ORIGINS,
        cors_kwargs["allow_origin_regex"],
    )
else:
    logger.info(
        "ENV=%s - CORS enabled with explicit origins: %s",
        getattr(settings, "ENV", "dev"),
        settings.CORS_ORIGINS,
    )
app.add_middleware(CORSMiddleware, **cors_kwargs)

# Security middleware (rate limiting and logging)
setup_middleware(app)

# WebSocket endpoints (must be registered before HTTP routers to avoid conflicts)
@app.websocket(f"{settings.API_V1_STR}/partner/ws")
async def partner_websocket(websocket: WebSocket):
    """WebSocket endpoint for partner notifications"""
    await websocket.accept()

    # Extract token from query parameters
    query_params = websocket.query_params
    token = query_params.get('token')

    if not token:
        await websocket.close(code=1008)  # Policy violation
        return

    # Authenticate user
    from .auth import get_current_user_ws
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001)  # Custom code for unauthorized
        return

    # Handle the partner WebSocket connection
    await ws.handle_partner_websocket_connection(websocket, user)


 

# Include routers (HTTP routes registered after WebSocket routes)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(proposals.router, prefix=settings.API_V1_STR)
app.include_router(partner.router, prefix=settings.API_V1_STR)
app.include_router(availability.router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health():
    return {"ok": True}


@app.get(f"{settings.API_V1_STR}/health")
async def api_health():
    return {"ok": True, "api_version": "v1"}
