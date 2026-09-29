"""CaseVault API and built frontend."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.db.base import init_db
from app.dms.routes import router
from app.dms.security import master_key, setup_token

configure_logging()
log = get_logger("casevault.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    master_key()
    setup_token()
    log.info("CaseVault ready. First-run setup token is in the data directory or DMS_SETUP_TOKEN.")
    yield


app = FastAPI(title=settings.app_name, description=settings.app_tagline, version=settings.app_version, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type", "X-Setup-Token"])
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api") else "private, max-age=0"
    return response


app.include_router(router)

DIST = (Path(__file__).resolve().parents[2] / "frontend" / "dist").resolve()
if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="spa-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            return FileResponse(DIST / "index.html", status_code=404)
        candidate = (DIST / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(DIST):
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
