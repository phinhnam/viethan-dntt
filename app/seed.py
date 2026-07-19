"""Dữ liệu khởi tạo: danh sách bộ phận và loại chứng từ theo tiền tố tên file."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Department, DocType

DEFAULT_DEPARTMENTS = [
    ("CNTT", "Công nghệ thông tin"),
    ("TCKT", "Tài chính Kế toán"),
    ("HCNS", "Hành chính Nhân sự"),
    ("KD", "Kinh doanh"),
    ("SX", "Sản xuất"),
    ("MH", "Mua hàng"),
]

# (tiền tố chính, tên loại, các tiền tố tương đương)
DEFAULT_DOC_TYPES = [
    ("TT", "Tờ trình", "TOTRINH"),
    ("HD", "Hóa đơn", "HOADON"),
    ("BG", "Báo giá", "QUOTE,QUOTO,BAOGIA"),
    ("DNTT", "Đề nghị thanh toán", ""),
    ("KHAC", "Chứng từ khác", ""),
]


def seed_defaults(db: Session) -> None:
    if db.execute(select(Department.id).limit(1)).first() is None:
        for code, name in DEFAULT_DEPARTMENTS:
            db.add(Department(code=code, name=name))
    if db.execute(select(DocType.id).limit(1)).first() is None:
        for prefix, name, aliases in DEFAULT_DOC_TYPES:
            db.add(DocType(prefix=prefix, name=name, aliases=aliases))
