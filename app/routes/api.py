import re
import unicodedata
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..config import settings
from ..database import get_db
from ..models import Attachment, Department, DocType, PaymentRequest
from ..numbering import allocate_number, peek_next_number

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------- Schemas

class RequestIn(BaseModel):
    department_id: int
    request_date: date
    requester_name: str = Field(min_length=1, max_length=120)
    content: str = ""
    advance_amount: int = 0
    total_debt: int = 0
    total_payment: int = 0
    final_amount: int = 0
    amount_in_words: str = ""
    debt_lines: list[dict] = []
    payment_lines: list[dict] = []


def _attachment_out(a: Attachment) -> dict:
    return {
        "id": a.id,
        "doc_type_prefix": a.doc_type_prefix,
        "original_name": a.original_name,
        "size": a.size,
        "uploaded_at": a.uploaded_at.isoformat(),
    }


def _request_out(r: PaymentRequest, full: bool = False) -> dict:
    out = {
        "id": r.id,
        "doc_number": r.doc_number,
        "department_id": r.department_id,
        "department_code": r.department.code,
        "department_name": r.department.name,
        "request_date": r.request_date.isoformat(),
        "requester_name": r.requester_name,
        "content": r.content,
        "total_payment": r.total_payment,
        "final_amount": r.final_amount,
        "created_at": r.created_at.isoformat(),
        "attachment_count": len(r.attachments),
    }
    if full:
        out.update(
            advance_amount=r.advance_amount,
            total_debt=r.total_debt,
            amount_in_words=r.amount_in_words,
            debt_lines=r.debt_lines or [],
            payment_lines=r.payment_lines or [],
            attachments=[_attachment_out(a) for a in r.attachments],
        )
    return out


# ---------------------------------------------------------------- Danh mục

@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    rows = db.execute(select(Department).order_by(Department.code)).scalars().all()
    return [{"id": d.id, "code": d.code, "name": d.name} for d in rows]


@router.get("/doc-types")
def list_doc_types(db: Session = Depends(get_db)):
    rows = db.execute(select(DocType).order_by(DocType.id)).scalars().all()
    return [
        {
            "id": t.id,
            "prefix": t.prefix,
            "name": t.name,
            "aliases": [a for a in t.aliases.split(",") if a],
        }
        for t in rows
    ]


@router.get("/next-number")
def next_number(
    department_id: int,
    request_date: date | None = None,
    db: Session = Depends(get_db),
):
    dept = db.get(Department, department_id)
    if dept is None:
        raise HTTPException(404, "Không tìm thấy bộ phận")
    preview = peek_next_number(db, dept, request_date or date.today())
    return {"preview": preview}


# ---------------------------------------------------------------- Phiếu

@router.post("/requests", status_code=201)
def create_request(body: RequestIn, db: Session = Depends(get_db)):
    dept = db.get(Department, body.department_id)
    if dept is None:
        raise HTTPException(404, "Không tìm thấy bộ phận")
    doc_number = allocate_number(db, dept, body.request_date)
    req = PaymentRequest(
        doc_number=doc_number,
        department_id=dept.id,
        request_date=body.request_date,
        requester_name=body.requester_name.strip(),
        content=body.content.strip(),
        advance_amount=body.advance_amount,
        total_debt=body.total_debt,
        total_payment=body.total_payment,
        final_amount=body.final_amount,
        amount_in_words=body.amount_in_words.strip(),
        debt_lines=body.debt_lines,
        payment_lines=body.payment_lines,
    )
    db.add(req)
    db.commit()
    return {"id": req.id, "doc_number": req.doc_number}


@router.put("/requests/{req_id}")
def update_request(req_id: int, body: RequestIn, db: Session = Depends(get_db)):
    req = db.get(PaymentRequest, req_id)
    if req is None:
        raise HTTPException(404, "Không tìm thấy phiếu")
    if body.department_id != req.department_id:
        raise HTTPException(
            400,
            "Không thể đổi bộ phận sau khi đã cấp số phiếu. "
            "Hãy lập phiếu mới nếu chọn nhầm bộ phận.",
        )
    req.request_date = body.request_date
    req.requester_name = body.requester_name.strip()
    req.content = body.content.strip()
    req.advance_amount = body.advance_amount
    req.total_debt = body.total_debt
    req.total_payment = body.total_payment
    req.final_amount = body.final_amount
    req.amount_in_words = body.amount_in_words.strip()
    req.debt_lines = body.debt_lines
    req.payment_lines = body.payment_lines
    db.commit()
    return {"id": req.id, "doc_number": req.doc_number}


@router.get("/requests")
def list_requests(
    q: str | None = None,
    department_id: int | None = None,
    period: str | None = Query(None, pattern=r"^\d{6}$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = (
        select(PaymentRequest)
        .options(
            joinedload(PaymentRequest.department),
            joinedload(PaymentRequest.attachments),
        )
        .order_by(PaymentRequest.created_at.desc())
    )
    count_stmt = select(func.count(PaymentRequest.id))
    if q:
        like = f"%{q.strip()}%"
        cond = or_(
            PaymentRequest.doc_number.ilike(like),
            PaymentRequest.requester_name.ilike(like),
            PaymentRequest.content.ilike(like),
        )
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    if department_id:
        stmt = stmt.where(PaymentRequest.department_id == department_id)
        count_stmt = count_stmt.where(PaymentRequest.department_id == department_id)
    if period:
        # Số phiếu chứa kỳ YYYYMM: CNTT-202607-001
        cond = PaymentRequest.doc_number.like(f"%-{period}-%")
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = db.execute(count_stmt).scalar_one()
    rows = db.execute(stmt.limit(limit).offset(offset)).unique().scalars().all()
    return {"total": total, "items": [_request_out(r) for r in rows]}


@router.get("/requests/{req_id}")
def get_request(req_id: int, db: Session = Depends(get_db)):
    req = db.get(
        PaymentRequest,
        req_id,
        options=[
            joinedload(PaymentRequest.department),
            joinedload(PaymentRequest.attachments),
        ],
    )
    if req is None:
        raise HTTPException(404, "Không tìm thấy phiếu")
    return _request_out(req, full=True)


# ---------------------------------------------------------------- Chứng từ

def _safe_ext(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return ext if re.fullmatch(r"\.[a-z0-9]{1,10}", ext) else ""


def _slug(text: str, max_len: int = 40) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")
    return text[:max_len] or "file"


@router.post("/requests/{req_id}/attachments", status_code=201)
def upload_attachment(
    req_id: int,
    file: UploadFile = File(...),
    doc_type_prefix: str = Form("KHAC"),
    db: Session = Depends(get_db),
):
    req = db.get(PaymentRequest, req_id)
    if req is None:
        raise HTTPException(404, "Không tìm thấy phiếu")
    prefix = doc_type_prefix.strip().upper() or "KHAC"
    if (
        db.execute(select(DocType).where(DocType.prefix == prefix)).scalar_one_or_none()
        is None
    ):
        raise HTTPException(400, f"Loại chứng từ không hợp lệ: {prefix}")

    data = file.file.read(settings.MAX_UPLOAD_SIZE + 1)
    if len(data) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            413,
            f"File vượt quá giới hạn {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )
    if not data:
        raise HTTPException(400, "File rỗng")

    original = Path(file.filename or "chungtu").name
    seq = len(req.attachments) + 1
    stamp = datetime.utcnow().strftime("%H%M%S%f")
    stored_name = (
        f"{req.doc_number}_{prefix}_{seq:02d}_{stamp}_{_slug(Path(original).stem)}"
        f"{_safe_ext(original)}"
    )
    (Path(settings.UPLOAD_DIR) / stored_name).write_bytes(data)

    att = Attachment(
        request_id=req.id,
        doc_type_prefix=prefix,
        original_name=original,
        stored_name=stored_name,
        size=len(data),
    )
    db.add(att)
    db.commit()
    return _attachment_out(att)


@router.get("/attachments/{att_id}/download")
def download_attachment(att_id: int, db: Session = Depends(get_db)):
    att = db.get(Attachment, att_id)
    if att is None:
        raise HTTPException(404, "Không tìm thấy chứng từ")
    path = Path(settings.UPLOAD_DIR) / att.stored_name
    if not path.is_file():
        raise HTTPException(410, "File không còn trên máy chủ")
    return FileResponse(path, filename=att.original_name)


@router.delete("/attachments/{att_id}", status_code=204)
def delete_attachment(att_id: int, db: Session = Depends(get_db)):
    att = db.get(Attachment, att_id)
    if att is None:
        raise HTTPException(404, "Không tìm thấy chứng từ")
    path = Path(settings.UPLOAD_DIR) / att.stored_name
    db.delete(att)
    db.commit()
    if path.is_file():
        path.unlink()
