import sys
import os
import threading

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

app = FastAPI(title="Text Anonymizer Engine", version="2.0.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine_service = None
_engine_loading = False
_engine_ready = False
_engine_error = None
_engine_lock = threading.Lock()

def _load_engine_worker():
    global _engine_service, _engine_ready, _engine_error, _engine_loading
    try:
        print("[Engine] Initializing spaCy & Presidio models in background...", flush=True)
        from engine.anonymizer_core import engine_service
        with _engine_lock:
            _engine_service = engine_service
            _engine_ready = True
        print("[Engine] Models loaded successfully! Engine is ready.", flush=True)
    except Exception as e:
        import traceback
        _engine_error = str(e)
        print(f"[Engine] Error loading models: {e}", flush=True)
        traceback.print_exc()
    finally:
        _engine_loading = False

def get_engine():
    global _engine_service, _engine_ready
    if _engine_service is not None:
        return _engine_service
    with _engine_lock:
        if _engine_service is None:
            from engine.anonymizer_core import engine_service
            _engine_service = engine_service
            _engine_ready = True
    return _engine_service

@app.on_event("startup")
def startup_event():
    global _engine_loading
    _engine_loading = True
    loader_thread = threading.Thread(target=_load_engine_worker, daemon=True)
    loader_thread.start()

class AnalyzePayload(BaseModel):
    text: str
    language: str = "fr"
    categories: Optional[List[str]] = None

class AnonymizePayload(BaseModel):
    text: str
    mappings: Dict[str, str]

class DeanonymizePayload(BaseModel):
    text: str
    mappings: Dict[str, str]

class InstallModelPayload(BaseModel):
    language: str

@app.get("/health")
def health():
    return {
        "status": "ok" if _engine_ready else "initializing",
        "ready": _engine_ready,
        "service": "local-anonymizer-engine",
        "error": _engine_error,
        "version": "2.0.2"
    }
    return {"status": "ok", "service": "local-anonymizer-engine", "version": "1.3.0"}

@app.get("/models")
def get_models_endpoint():
    try:
        from engine.anonymizer_core import SPACY_MODEL_MAP, get_installed_spacy_models
        installed = get_installed_spacy_models()
        available = [
            {"code": k, "name": SPACY_MODEL_MAP[k], "installed": k in installed}
            for k in SPACY_MODEL_MAP
        ]
        return {"models": available, "installed_languages": installed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/install")
def install_model_endpoint(payload: InstallModelPayload):
    try:
        from engine.anonymizer_core import install_spacy_model
        engine = get_engine()
        success = install_spacy_model(payload.language)
        if success:
            engine.reload_analyzer()
            return {"status": "success", "language": payload.language}
        else:
            raise HTTPException(status_code=500, detail="Failed to download spaCy model")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
def analyze_endpoint(payload: AnalyzePayload):
    try:
        engine = get_engine()
        entities = engine.detect_entities(payload.text, payload.language, payload.categories)
        return {"entities": entities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anonymize")
def anonymize_endpoint(payload: AnonymizePayload):
    try:
        engine = get_engine()
        anonymized = engine.anonymize_text(payload.text, payload.mappings)
        return {"anonymized_text": anonymized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/deanonymize")
def deanonymize_endpoint(payload: DeanonymizePayload):
    try:
        engine = get_engine()
        res = engine.deanonymize_text(payload.text, payload.mappings)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("[Engine] Starting server immediately on http://127.0.0.1:8765...", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
