"""ID-SHIELD API entrypoint."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import (
    routes_analysis,
    routes_analytics,
    routes_audit,
    routes_auth,
    routes_cases,
    routes_comparison,
    routes_dashboard,
    routes_demo,
    routes_faces,
    routes_forensics,
    routes_health,
    routes_notifications,
    routes_redaction,
    routes_risk,
    routes_report,
    routes_search,
    routes_users,
    routes_voice,
)
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.db.base import init_db

configure_logging()
log = get_logger("idshield.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("APPLICATION_STARTED | db=%s", settings.database_url.split("///")[-1])
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Secure Digital Document Management System for Legal and Investigation Documents "
        "(Ministry of Home Affairs / NCRB). Features supporting confidentiality, auditability, "
        "document integrity, version control, and evidentiary traceability."
    ),
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def security_headers(request, call_next):  # noqa: ANN001, ANN201
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=*, microphone=*, geolocation=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


app.include_router(routes_health.router, prefix="/api", tags=["system"])
app.include_router(routes_auth.router, prefix="/api", tags=["authentication"])
app.include_router(routes_users.router, prefix="/api", tags=["users"])
app.include_router(routes_audit.router, prefix="/api", tags=["audit"])
app.include_router(routes_dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(routes_analytics.router, prefix="/api", tags=["analytics"])
app.include_router(routes_cases.router, prefix="/api", tags=["cases"])
app.include_router(routes_redaction.router)
app.include_router(routes_search.router, prefix="/api", tags=["search"])
app.include_router(routes_analysis.router, prefix="/api", tags=["analysis"])
app.include_router(routes_comparison.router, prefix="/api", tags=["comparison"])
app.include_router(routes_forensics.router, prefix="/api", tags=["forensics"])
app.include_router(routes_faces.router, prefix="/api", tags=["faces"])
app.include_router(routes_notifications.router, prefix="/api", tags=["notifications"])
app.include_router(routes_risk.router, prefix="/api", tags=["risk"])
app.include_router(routes_report.router, prefix="/api", tags=["report"])
app.include_router(routes_voice.router, prefix="/api", tags=["voice"])
app.include_router(routes_demo.router, prefix="/api", tags=["demo"])

# ---- Production single-origin hosting -------------------------------------
# When the frontend has been built (npm run build), serve it from this app
# so a single process/host serves UI + API. In dev, Vite serves the UI on
# :5173 and proxies /api here instead.
_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_DIST = _DIST.resolve()

if _DIST.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=_DIST / "assets"),
        name="spa-assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):  # noqa: ANN201
        if full_path.startswith("api/"):
            return FileResponse(_DIST / "index.html", status_code=404)
        candidate = (_DIST / full_path).resolve()
        if full_path and candidate.is_file() and str(candidate).startswith(str(_DIST)):
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")

    log.info("SPA_SERVED | dir=%s", _DIST)
