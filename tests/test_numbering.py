from datetime import date

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Department
from app.numbering import allocate_number, peek_next_number


def _dept(db, code):
    return db.execute(select(Department).where(Department.code == code)).scalar_one()


def test_numbers_increase_sequentially(client):
    with SessionLocal() as db:
        cntt = _dept(db, "CNTT")
        d = date(2026, 7, 19)
        assert allocate_number(db, cntt, d) == "CNTT-202607-001"
        assert allocate_number(db, cntt, d) == "CNTT-202607-002"
        assert allocate_number(db, cntt, d) == "CNTT-202607-003"
        db.commit()


def test_each_department_has_own_counter(client):
    with SessionLocal() as db:
        tckt = _dept(db, "TCKT")
        d = date(2026, 7, 19)
        # CNTT đã đếm tới 003 ở test trước, TCKT vẫn bắt đầu từ 001
        assert allocate_number(db, tckt, d) == "TCKT-202607-001"
        db.commit()


def test_counter_resets_each_month(client):
    with SessionLocal() as db:
        cntt = _dept(db, "CNTT")
        assert allocate_number(db, cntt, date(2026, 8, 1)) == "CNTT-202608-001"
        db.commit()


def test_peek_does_not_allocate(client):
    with SessionLocal() as db:
        hcns = _dept(db, "HCNS")
        d = date(2026, 7, 19)
        assert peek_next_number(db, hcns, d) == "HCNS-202607-001"
        assert peek_next_number(db, hcns, d) == "HCNS-202607-001"
        assert allocate_number(db, hcns, d) == "HCNS-202607-001"
        db.commit()
