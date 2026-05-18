from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Create a centralized rate limiter using client remote address
# Uses local memory storage as default; robust fallback when Redis is absent
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120 per minute"],
    storage_uri="memory://"
)
