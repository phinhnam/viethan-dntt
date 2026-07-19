from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, SessionLocal, engine
from .seed import seed_defaults


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_defaults(db)
            db.commit()
        Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        yield

    app = FastAPI(
        title="Đề nghị thanh toán / Hoàn ứng - Việt Hàn (TCKT-DNTT-BM01)",
        lifespan=lifespan,
    )

    static_dir = Path(__file__).resolve().parent / "static"
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    from .routes.api import router as api_router
    from .routes.pages import router as pages_router

    app.include_router(api_router)
    app.include_router(pages_router)
    return app
