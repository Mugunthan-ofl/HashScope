"""FastAPI Application Entrypoint & Composition Root for HashScope Backend."""

import os
import sys
import yaml

# Ensure project root is on sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes.audit import router as audit_router

# Load optional config.yaml
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.yaml")
config = {}
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f) or {}

app = FastAPI(
    title=config.get("app", {}).get("title", "HashScope Password Policy Audit API"),
    version=config.get("app", {}).get("version", "0.1.0"),
    description="Password policy audit tool evaluating hash cracking difficulty and policy compliance."
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.core.cracking.binary_resolver import check_all_engines
from backend.core.config_manager import get_engine_binary_paths

# Include API routes
app.include_router(audit_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Startup validation checking cracking engine installations."""
    paths = get_engine_binary_paths()
    res = check_all_engines(
        custom_hashcat_path=paths.get("hashcat_binary_path"),
        custom_john_path=paths.get("john_binary_path"),
    )
    for engine_key, info in res.items():
        if info["status"] == "found":
            print(f"[HashScope Startup] Engine '{info['engine']}': FOUND ({info['version']}) at '{info['binary_path']}'")
        else:
            print(f"[HashScope Startup] Engine '{info['engine']}': NOT FOUND. Checked: {info['checked_paths']}")



@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend service availability."""
    return {
        "status": "healthy",
        "service": "HashScope API",
        "version": config.get("app", {}).get("version", "0.1.0")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
