from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.exceptions import SGOException, sgo_exception_handler, validation_exception_handler

# Routers
from app.routers.auth import router as router_auth
from app.routers.obras import router as router_obras, router_servicos
from app.routers.pcp import router as router_pcp
from app.routers.operacional import router as router_operacional
from app.routers.qualidade import router as router_qualidade
from app.routers.misc import (
    router_usuarios, router_almox,
    router_diario, router_dashboard,
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SGO — Sistema de Gestão Operacional de Obras",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── EXCEPTION HANDLERS ──────────────────────────────────────
app.add_exception_handler(SGOException, sgo_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# ─── ROUTERS ─────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(router_auth,        prefix=PREFIX)
app.include_router(router_obras,       prefix=PREFIX)
app.include_router(router_servicos,    prefix=PREFIX)
app.include_router(router_pcp,         prefix=PREFIX)
app.include_router(router_operacional, prefix=PREFIX)
app.include_router(router_qualidade,   prefix=PREFIX)
app.include_router(router_usuarios,    prefix=PREFIX)
app.include_router(router_almox,       prefix=PREFIX)
app.include_router(router_diario,      prefix=PREFIX)
app.include_router(router_dashboard,   prefix=PREFIX)


# ─── HEALTH CHECK ────────────────────────────────────────────
@app.get("/health", tags=["Sistema"])
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }


@app.get("/", tags=["Sistema"])
def root():
    return {"message": f"Bem-vindo ao {settings.APP_NAME} API v{settings.APP_VERSION}"}
