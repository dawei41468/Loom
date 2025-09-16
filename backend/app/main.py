from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import connect_to_mongo, close_mongo_connection, get_database
from .middleware import setup_middleware
from .cache import cache_manager
from .routers import auth, events, tasks, proposals, partner, availability, websockets, push
from .reminders import start_reminders_loop, stop_reminders_loop


def _validate_security_settings():
    """Validate critical security settings based on environment.

    - In production, fail fast if SECRET_KEY appears to be a default placeholder.
    - Warn if CORS settings are permissive.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Fail fast on bad secrets in production
    if getattr(settings, "ENV", "dev") in {"prod", "production"}:
        default_secret_substr = "your-super-secure-secret-key-change-this"
        if default_secret_substr in getattr(settings, "SECRET_KEY", ""):
            raise RuntimeError(
                "SECURITY: SECRET_KEY is using a default value in production. "
                "Set a strong unique SECRET_KEY via environment variables."
            )

        # Ensure CORS is explicitly configured in production
        if not getattr(settings, "CORS_ORIGINS", []):
            raise RuntimeError(
                "SECURITY: CORS_ORIGINS is empty in production. Configure allowed origins explicitly."
            )
    else:
        # Development guidance
        logger.info(
            "Security (dev): Using development settings. Ensure SECRET_KEY and CORS are hardened in production."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    _validate_security_settings()
    await connect_to_mongo()
    await cache_manager.initialize()
    # Start reminders background loop after DB is available
    try:
        start_reminders_loop(get_database())
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to start reminders loop: {e}")
    yield
    # Shutdown
    try:
        stop_reminders_loop()
    except Exception:
        pass
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
    # Note: allow_origin_regex expects a list of strings, not a single string
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

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(proposals.router, prefix=settings.API_V1_STR)
app.include_router(partner.router, prefix=settings.API_V1_STR)
app.include_router(availability.router, prefix=settings.API_V1_STR)
app.include_router(websockets.router, prefix=settings.API_V1_STR)
if getattr(settings, "FEATURE_PUSH_NOTIFICATIONS", False):
    app.include_router(push.router, prefix=settings.API_V1_STR)
else:
    logger.info("FEATURE_PUSH_NOTIFICATIONS disabled; push routes not mounted.")


@app.get("/health")
async def health():
    return {"ok": True}


@app.get(f"{settings.API_V1_STR}/health")
async def api_health():
    return {"ok": True, "api_version": "v1"}
