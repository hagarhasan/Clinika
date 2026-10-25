import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app as fastapi_app  # noqa: E402

PREFIX = "/api/index"


async def app(scope, receive, send):
    """يشيل البادئة /api/index من المسار لو Vercel أضافها بسبب الـ rewrite."""
    if scope["type"] in ("http", "websocket"):
        path = scope.get("path", "")
        if path.startswith(PREFIX):
            scope = dict(scope)
            scope["path"] = path[len(PREFIX):] or "/"
            raw = scope.get("raw_path")
            if raw:
                scope["raw_path"] = raw[len(PREFIX):] or b"/"
    await fastapi_app(scope, receive, send)