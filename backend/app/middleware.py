import logging
import time
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from .config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)


async def logging_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware for logging requests and responses.
    """
    start_time = time.time()

    # Log incoming request
    client_host = request.client.host if request.client else "unknown"
    logger.info(f"Request: {request.method} {request.url} from {client_host}")

    try:
        # Process the request
        response = await call_next(request)

        # Calculate processing time
        process_time = time.time() - start_time

        # Log response
        logger.info(
            f"Response: {response.status_code} for {request.method} {request.url} "
            f"in {process_time:.4f}s"
        )

        # Add processing time to response headers
        response.headers["X-Process-Time"] = str(process_time)

        return response

    except Exception as e:
        # Log errors
        process_time = time.time() - start_time
        logger.error(
            f"Error: {str(e)} for {request.method} {request.url} "
            f"in {process_time:.4f}s"
        )
        raise


def create_rate_limit_exceeded_handler():
    """
    Custom handler for rate limit exceeded errors.
    """
    return _rate_limit_exceeded_handler


def setup_middleware(app):
    """
    Setup all middleware for the FastAPI application.
    """
    # Add rate limiting middleware
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # Add logging middleware
    app.middleware("http")(logging_middleware)

    logger.info("Security middleware initialized successfully")