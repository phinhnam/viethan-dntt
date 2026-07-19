"""Cấp số phiếu tập trung, an toàn khi nhiều người lưu phiếu cùng lúc.

Quy tắc: <MÃ BỘ PHẬN>-<YYYYMM>-<NNN>, bộ đếm riêng cho từng bộ phận và
reset đầu mỗi tháng (kỳ lấy theo ngày lập phiếu). Ví dụ: CNTT-202607-001.

Chống trùng số bằng khóa dòng (SELECT ... FOR UPDATE) trên PostgreSQL;
nếu hai giao dịch cùng tạo bộ đếm mới cho một kỳ, ràng buộc UNIQUE
(department_id, period) sẽ chặn và giao dịch thua sẽ khóa dòng vừa tạo.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import Counter, Department


def _format(code: str, period: str, number: int) -> str:
    return f"{code}-{period}-{number:03d}"


def allocate_number(db: Session, department: Department, on_date: date) -> str:
    """Cấp số phiếu tiếp theo trong giao dịch hiện tại (chưa commit)."""
    period = on_date.strftime("%Y%m")
    for _ in range(2):
        counter = db.execute(
            select(Counter)
            .where(Counter.department_id == department.id, Counter.period == period)
            .with_for_update()
        ).scalar_one_or_none()
        if counter is not None:
            counter.last_no += 1
            db.flush()
            return _format(department.code, period, counter.last_no)
        try:
            with db.begin_nested():
                db.add(Counter(department_id=department.id, period=period, last_no=1))
            return _format(department.code, period, 1)
        except IntegrityError:
            # Giao dịch khác vừa tạo bộ đếm cho kỳ này - quay lại khóa nó
            continue
    raise RuntimeError("Không thể cấp số phiếu, vui lòng thử lại")


def peek_next_number(db: Session, department: Department, on_date: date) -> str:
    """Xem trước số phiếu dự kiến (không giữ chỗ - số thật cấp khi lưu)."""
    period = on_date.strftime("%Y%m")
    counter = db.execute(
        select(Counter).where(
            Counter.department_id == department.id, Counter.period == period
        )
    ).scalar_one_or_none()
    next_no = (counter.last_no if counter else 0) + 1
    return _format(department.code, period, next_no)
