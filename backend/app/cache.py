import json
from typing import Any, Optional, Union
from .config import settings

# Import aiocache with fallback handling
try:
    from aiocache import caches  # type: ignore
    from aiocache.serializers import JsonSerializer  # type: ignore
    AIOCACHE_AVAILABLE = True
except ImportError:
    AIOCACHE_AVAILABLE = False
    caches = None  # type: ignore


class CacheManager:
    """Cache manager with Redis and in-memory fallback"""

    def __init__(self):
        self.cache: Optional[Any] = None
        self._initialized = False

    async def initialize(self):
        """Initialize cache with Redis or fallback to memory"""
        if self._initialized:
            return

        if not AIOCACHE_AVAILABLE:
            print("aiocache not available, cache disabled")
            self._initialized = True
            return

        try:
            if settings.CACHE_ENABLED and caches:
                # Try Redis first
                caches.set_config({  # type: ignore
                    'default': {
                        'cache': "aiocache.RedisCache",
                        'endpoint': settings.CACHE_REDIS_URL,
                        'serializer': {
                            'class': "aiocache.serializers.JsonSerializer"
                        },
                        'ttl': settings.CACHE_TTL
                    }
                })
                self.cache = caches.get('default')  # type: ignore
                if self.cache:
                    await self.cache.clear()  # type: ignore
                print("Redis cache initialized")
            else:
                raise Exception("Cache disabled or aiocache not available")

        except Exception as e:
            print(f"Redis cache failed, falling back to memory cache: {e}")
            # Fallback to memory cache
            try:
                if caches:
                    caches.set_config({  # type: ignore
                        'default': {
                            'cache': "aiocache.SimpleMemoryCache",
                            'serializer': {
                                'class': "aiocache.serializers.JsonSerializer"
                            },
                            'ttl': settings.CACHE_TTL
                        }
                    })
                    self.cache = caches.get('default')  # type: ignore
                else:
                    self.cache = None
            except Exception as fallback_error:
                print(f"Memory cache also failed: {fallback_error}")
                self.cache = None

        self._initialized = True

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._initialized:
            await self.initialize()

        if not self.cache:
            return None

        try:
            return await self.cache.get(key)  # type: ignore
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        if not self._initialized:
            await self.initialize()

        if not self.cache:
            return False

        try:
            await self.cache.set(key, value, ttl=ttl or settings.CACHE_TTL)  # type: ignore
            return True
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self._initialized:
            await self.initialize()

        if not self.cache:
            return False

        try:
            await self.cache.delete(key)  # type: ignore
            return True
        except Exception:
            return False

    async def clear(self) -> bool:
        """Clear all cache"""
        if not self._initialized:
            await self.initialize()

        if not self.cache:
            return False

        try:
            await self.cache.clear()  # type: ignore
            return True
        except Exception:
            return False

    async def get_or_set(self, key: str, default_func, ttl: Optional[int] = None):
        """Get from cache or set default value"""
        value = await self.get(key)
        if value is None:
            value = await default_func()
            if value is not None:
                await self.set(key, value, ttl)
        return value


# Global cache instance
cache_manager = CacheManager()


def get_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate cache key from prefix and arguments"""
    key_parts = [prefix]

    # Add positional arguments
    for arg in args:
        if isinstance(arg, (str, int, float, bool)):
            key_parts.append(str(arg))
        else:
            key_parts.append(str(hash(str(arg))))

    # Add keyword arguments (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        if isinstance(v, (str, int, float, bool)):
            key_parts.append(f"{k}:{v}")
        else:
            key_parts.append(f"{k}:{hash(str(v))}")

    return ":".join(key_parts)


# Cache decorators for common patterns
def cache_response(ttl: Optional[int] = None, key_prefix: str = "api"):
    """Decorator to cache API responses"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = get_cache_key(key_prefix, func.__name__, *args, **kwargs)

            # Try to get from cache first
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function
            result = await func(*args, **kwargs)

            # Cache the result
            if result is not None:
                await cache_manager.set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator


def invalidate_cache(key_prefix: str = "api", *key_args, **key_kwargs):
    """Invalidate cache entries"""
    async def invalidate():
        cache_key = get_cache_key(key_prefix, *key_args, **key_kwargs)
        await cache_manager.delete(cache_key)
    return invalidate