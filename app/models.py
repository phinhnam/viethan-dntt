from datetime import date, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Department(Base):
    """Bộ phận - quyết định tiền tố số phiếu, ví dụ CNTT-202607-001."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120))


class DocType(Base):
    """Loại chứng từ, nhận diện qua tiền tố tên file (TT-, HD-, BG-...)."""

    __tablename__ = "doc_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    prefix: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    # Các tiền tố tương đương, phân tách bằng dấu phẩy (VD: QUOTE,QUOTO cho BG)
    aliases: Mapped[str] = mapped_column(String(200), default="")


class Counter(Base):
    """Bộ đếm số phiếu: mỗi bộ phận một dòng cho mỗi kỳ YYYYMM, reset theo tháng."""

    __tablename__ = "doc_counters"
    __table_args__ = (
        UniqueConstraint("department_id", "period", name="uq_counter_dept_period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    period: Mapped[str] = mapped_column(String(6))  # YYYYMM
    last_no: Mapped[int] = mapped_column(default=0)


class PaymentRequest(Base):
    """Phiếu đề nghị thanh toán / hoàn ứng."""

    __tablename__ = "payment_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    doc_number: Mapped[str] = mapped_column(String(40), unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    request_date: Mapped[date] = mapped_column(Date)
    requester_name: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text, default="")

    # Số tiền lưu bằng VND nguyên (không lẻ)
    advance_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    total_debt: Mapped[int] = mapped_column(BigInteger, default=0)
    total_payment: Mapped[int] = mapped_column(BigInteger, default=0)
    # Dương: đề nghị thanh toán thêm; âm: hoàn ứng lại
    final_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    amount_in_words: Mapped[str] = mapped_column(Text, default="")

    debt_lines: Mapped[list] = mapped_column(JSON, default=list)
    payment_lines: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    department: Mapped[Department] = relationship()
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="request", cascade="all, delete-orphan"
    )


class Attachment(Base):
    """File chứng từ đính kèm phiếu, đã phân loại theo tiền tố tên file."""

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("payment_requests.id"))
    doc_type_prefix: Mapped[str] = mapped_column(String(20), default="KHAC")
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(255), unique=True)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    request: Mapped[PaymentRequest] = relationship(back_populates="attachments")
