import io
import re


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_catalogs_seeded(client):
    depts = client.get("/api/departments").json()
    assert any(d["code"] == "CNTT" for d in depts)

    types = client.get("/api/doc-types").json()
    prefixes = {t["prefix"] for t in types}
    assert {"TT", "BG", "NT", "HD", "HDKT", "DNTT", "KHAC"} <= prefixes
    bg = next(t for t in types if t["prefix"] == "BG")
    assert "QUOTE" in bg["aliases"]
    hdkt = next(t for t in types if t["prefix"] == "HDKT")
    assert "HĐ" in hdkt["aliases"]


def _dept_id(client, code):
    return next(d["id"] for d in client.get("/api/departments").json() if d["code"] == code)


def _payload(client, **overrides):
    body = {
        "department_id": _dept_id(client, "KD"),
        "request_date": "2026-07-19",
        "requester_name": "Nguyễn Văn A",
        "content": "Thanh toán mua vật tư",
        "advance_amount": 5_000_000,
        "total_debt": 12_000_000,
        "total_payment": 12_000_000,
        "final_amount": 7_000_000,
        "amount_in_words": "Bảy triệu đồng",
        "debt_lines": [{"desc": "Vật tư", "amount": 12_000_000}],
        "payment_lines": [{"desc": "Thanh toán NCC", "amount": 12_000_000}],
    }
    body.update(overrides)
    return body


def test_create_request_allocates_number(client):
    res = client.post("/api/requests", json=_payload(client))
    assert res.status_code == 201
    doc_number = res.json()["doc_number"]
    assert re.fullmatch(r"KD-202607-\d{3}", doc_number)

    res2 = client.post("/api/requests", json=_payload(client))
    n1 = int(doc_number.rsplit("-", 1)[1])
    n2 = int(res2.json()["doc_number"].rsplit("-", 1)[1])
    assert n2 == n1 + 1


def test_get_and_list_request(client):
    created = client.post("/api/requests", json=_payload(client)).json()

    detail = client.get(f"/api/requests/{created['id']}").json()
    assert detail["doc_number"] == created["doc_number"]
    assert detail["debt_lines"][0]["amount"] == 12_000_000

    listing = client.get("/api/requests", params={"q": created["doc_number"]}).json()
    assert listing["total"] == 1
    assert listing["items"][0]["id"] == created["id"]

    by_period = client.get("/api/requests", params={"period": "202607"}).json()
    assert any(item["id"] == created["id"] for item in by_period["items"])


def test_update_cannot_change_department(client):
    created = client.post("/api/requests", json=_payload(client)).json()
    res = client.put(
        f"/api/requests/{created['id']}",
        json=_payload(client, department_id=_dept_id(client, "SX")),
    )
    assert res.status_code == 400


def test_attachment_upload_and_download(client):
    created = client.post("/api/requests", json=_payload(client)).json()
    res = client.post(
        f"/api/requests/{created['id']}/attachments",
        files={"file": ("HD-0012345.pdf", io.BytesIO(b"%PDF-fake"), "application/pdf")},
        data={"doc_type_prefix": "HD"},
    )
    assert res.status_code == 201
    att = res.json()
    assert att["doc_type_prefix"] == "HD"

    dl = client.get(f"/api/attachments/{att['id']}/download")
    assert dl.status_code == 200
    assert dl.content == b"%PDF-fake"

    assert client.delete(f"/api/attachments/{att['id']}").status_code == 204
    assert client.get(f"/api/attachments/{att['id']}/download").status_code == 404


def test_invalid_doc_type_rejected(client):
    created = client.post("/api/requests", json=_payload(client)).json()
    res = client.post(
        f"/api/requests/{created['id']}/attachments",
        files={"file": ("x.pdf", io.BytesIO(b"data"), "application/pdf")},
        data={"doc_type_prefix": "SAIPREFIX"},
    )
    assert res.status_code == 400
