import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import Settings
from app.core.request_context import reset_request_id, set_request_id


class RequestIdMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings):
        super().__init__(app)
        self.settings = settings

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id_header = self.settings.app_request_id_header
        request_id = request.headers.get(request_id_header) or str(uuid.uuid4())
        token = set_request_id(request_id)
        started = time.perf_counter()

        try:
            response = await call_next(request)
        finally:
            reset_request_id(token)

        response.headers[request_id_header] = request_id
        response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - started) * 1000:.2f}"
        return response
