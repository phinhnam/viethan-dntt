import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("DEBUG", "1") == "1"
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-doi-khi-chay-that")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
    # Giới hạn kích thước 1 file chứng từ (bytes) - mặc định 25MB
    MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(25 * 1024 * 1024)))


settings = Settings()
