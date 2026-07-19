"""Dữ liệu khởi tạo: danh sách bộ phận và loại chứng từ theo tiền tố tên file."""

from sqlalchemy import select, text
from sqlalchemy.engine import Engine
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

# (tiền tố chính, tên loại, các tiền tố tương đương) - theo biểu mẫu TCKT-DNTT-BM01:
# TT- (Tờ trình), BG- (Báo giá), NT- (Nghiệm thu), HD- (Hóa đơn), HDKT-/HĐ- (Hợp đồng)
DEFAULT_DOC_TYPES = [
    ("TT", "Tờ trình", "TOTRINH"),
    ("BG", "Báo giá", "QUOTE,QUOTO,BAOGIA"),
    ("NT", "Nghiệm thu", "BBNT,NGHIEMTHU"),
    ("HD", "Hóa đơn", "HOADON"),
    ("HDKT", "Hợp đồng", "HĐ,HOPDONG,HDMB"),
    ("DNTT", "Đề nghị thanh toán", ""),
    ("KHAC", "Chứng từ khác", ""),
]


def seed_defaults(db: Session) -> None:
    if db.execute(select(Department.id).limit(1)).first() is None:
        for code, name in DEFAULT_DEPARTMENTS:
            db.add(Department(code=code, name=name))

    # Loại chứng từ: thêm tiền tố còn thiếu, cập nhật tên/alias tiền tố đã có
    existing = {t.prefix: t for t in db.execute(select(DocType)).scalars()}
    for prefix, name, aliases in DEFAULT_DOC_TYPES:
        if prefix in existing:
            existing[prefix].name = name
            existing[prefix].aliases = aliases
        else:
            db.add(DocType(prefix=prefix, name=name, aliases=aliases))


def migrate_columns(engine: Engine) -> None:
    """Bổ sung cột mới cho database đã tạo từ phiên bản trước.

    create_all không thêm cột vào bảng có sẵn, nên thêm thủ công; cột đã
    tồn tại thì câu ALTER lỗi và được bỏ qua.
    """
    new_columns = {
        "recipient": "VARCHAR(200) DEFAULT ''",
        "bank_account": "VARCHAR(200) DEFAULT ''",
    }
    for column, ddl in new_columns.items():
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(f"ALTER TABLE payment_requests ADD COLUMN {column} {ddl}")
                )
        except Exception:
            pass
