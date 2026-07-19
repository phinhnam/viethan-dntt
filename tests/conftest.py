import os
import tempfile

import pytest

# Cấu hình môi trường test TRƯỚC khi import app
_tmp = tempfile.mkdtemp(prefix="dntt-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app import create_app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    # Dùng "with" để chạy lifespan (tạo bảng + seed dữ liệu mặc định)
    with TestClient(create_app()) as c:
        yield c
