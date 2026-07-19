from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()

templates = Jinja2Templates(
    directory=Path(__file__).resolve().parent.parent / "templates"
)


@router.get("/", include_in_schema=False)
def form_page(request: Request):
    """Trang lập phiếu cho mọi người dùng."""
    return templates.TemplateResponse(
        request, "index.html", {"request_id": "null"}
    )


@router.get("/phieu/{req_id}", include_in_schema=False)
def view_page(request: Request, req_id: int):
    """Mở lại một phiếu đã lưu để xem / sửa / in lại."""
    return templates.TemplateResponse(
        request, "index.html", {"request_id": str(req_id)}
    )


@router.get("/ketoan", include_in_schema=False)
def accounting_page(request: Request):
    """Trang riêng cho kế toán: danh sách, tìm kiếm toàn bộ phiếu."""
    return templates.TemplateResponse(request, "list.html", {})
