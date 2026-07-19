# Đề nghị thanh toán / Hoàn ứng (TCKT-DNTT-BM01)

Ứng dụng web nội bộ cho **50–100 người dùng** của Việt Hàn lập phiếu
**Đề nghị thanh toán / Hoàn ứng**: tính toán các ô trong bảng công nợ và
thanh toán, đổi số thành chữ tiếng Việt, kéo-thả file chứng từ tự phân loại
theo tiền tố tên file, cấp số phiếu tự động theo bộ phận, lưu phiếu vào
PostgreSQL và in / xuất PDF.

**Không cần đăng nhập.** Người lập tự nhập tên vào phiếu. Kế toán có trang
danh sách riêng tại `/ketoan`.

## Quy tắc cấp số phiếu

Chọn bộ phận từ danh sách sổ xuống → số phiếu dạng:

```
<MÃ BỘ PHẬN>-<YYYYMM>-<NNN>     ví dụ: CNTT-202607-001
```

- Bộ đếm **riêng cho từng bộ phận**, **reset đầu mỗi tháng** (kỳ lấy theo
  ngày lập phiếu).
- Số **chỉ cấp chính thức khi bấm Lưu phiếu** (trước đó chỉ hiển thị số dự
  kiến), cấp trong giao dịch PostgreSQL có khóa dòng nên **không bao giờ
  trùng số** dù nhiều người lưu cùng lúc.
- Danh sách bộ phận khởi tạo sẵn: CNTT, TCKT, HCNS, KD, SX, MH (thêm/sửa
  trực tiếp trong bảng `departments`).

## Phân loại chứng từ theo tiền tố tên file

Kéo-thả file vào phiếu, hệ thống đọc tiền tố tên file để tự chọn loại
(có thể sửa tay trước khi lưu):

| Tiền tố | Loại chứng từ |
|---|---|
| `TT-` | Tờ trình |
| `HD-` | Hóa đơn |
| `BG-` / `QUOTE` / `QUOTO` | Báo giá |
| `DNTT-` | Đề nghị thanh toán |
| (khác) | Chứng từ khác |

File lưu trên server trong `UPLOAD_DIR`, đổi tên chuẩn
`<SốPhiếu>_<TiềnTố>_<STT>_...` và tải lại được từ trang phiếu.

## Công nghệ

- **Backend**: Python 3.10+, FastAPI + SQLAlchemy 2, chạy bằng
  Uvicorn (dev) / Gunicorn (production).
- **Database**: PostgreSQL (đã dựng sẵn — khai báo `DATABASE_URL`);
  không khai báo thì dùng SQLite để chạy thử.
- **Frontend**: HTML + JavaScript thuần (không cần build tool), Jinja2
  templates. Toàn bộ tính toán bảng, đổi số thành chữ chạy phía trình duyệt.

## Cấu trúc dự án

```
app/
├── __init__.py        # create_app: tạo bảng, seed danh mục, mount static
├── main.py            # Điểm khởi chạy (uvicorn)
├── config.py          # Đọc biến môi trường (.env)
├── database.py        # Engine + session SQLAlchemy
├── models.py          # Department, DocType, Counter, PaymentRequest, Attachment
├── numbering.py       # Cấp số phiếu nguyên tử theo bộ phận + tháng
├── seed.py            # Danh mục bộ phận & tiền tố chứng từ mặc định
├── routes/
│   ├── api.py         # API: danh mục, phiếu, chứng từ
│   └── pages.py       # Trang: / (lập phiếu), /phieu/{id}, /ketoan
├── static/
│   ├── css/styles.css # Giao diện + CSS in A4
│   ├── js/            # format, number-to-words, calculations,
│   │                  # documents (kéo-thả), logo, main, list, api
│   └── img/           # Logo Việt Hàn / Việt Hàn CNC (placeholder SVG)
└── templates/         # base.html, index.html (phiếu), list.html (kế toán)
tests/                 # pytest: cấp số, API phiếu, upload chứng từ
```

## Cài đặt & chạy

Yêu cầu: Python 3.10+.

```bash
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                # Windows: copy .env.example .env
# Sửa .env: điền DATABASE_URL trỏ tới PostgreSQL đã dựng sẵn và đổi SECRET_KEY

python -m app.main
```

Mở http://127.0.0.1:5000 — trang lập phiếu; http://127.0.0.1:5000/ketoan —
trang kế toán.

Chạy production (hosting có sẵn):

```bash
gunicorn "app.main:app" -k uvicorn.workers.UvicornWorker -w 4 --bind 0.0.0.0:8000
```

## Kiểm thử

```bash
pytest
```

## API chính

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra máy chủ |
| GET | `/api/departments` | Danh sách bộ phận (sổ xuống) |
| GET | `/api/doc-types` | Loại chứng từ + tiền tố tên file |
| GET | `/api/next-number?department_id=` | Xem trước số phiếu (không giữ chỗ) |
| POST | `/api/requests` | Lưu phiếu mới — cấp số chính thức |
| PUT | `/api/requests/{id}` | Sửa phiếu (không đổi được bộ phận) |
| GET | `/api/requests` | Danh sách + lọc `q`, `department_id`, `period` |
| GET | `/api/requests/{id}` | Chi tiết phiếu + chứng từ |
| POST | `/api/requests/{id}/attachments` | Upload chứng từ (multipart) |
| GET | `/api/attachments/{id}/download` | Tải chứng từ |
| DELETE | `/api/attachments/{id}` | Xóa chứng từ |

## Biến môi trường (.env)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `HOST` | `127.0.0.1` | Địa chỉ lắng nghe |
| `PORT` | `5000` | Cổng |
| `DEBUG` | `1` | Auto-reload khi dev (`0` để tắt) |
| `DATABASE_URL` | `sqlite:///./dev.db` | Chuỗi kết nối; production dùng `postgresql+psycopg2://...` |
| `UPLOAD_DIR` | `./uploads` | Thư mục lưu file chứng từ |
| `MAX_UPLOAD_SIZE` | `26214400` | Giới hạn 1 file (bytes, mặc định 25MB) |
| `SECRET_KEY` | (dev) | Khóa ký — đổi khi chạy thật |

## Ghi chú triển khai

- Logo trong `app/static/img/` là **SVG tạm** — thay bằng logo thật của
  Việt Hàn / Việt Hàn CNC (giữ nguyên tên file).
- Muốn thêm bộ phận hoặc tiền tố chứng từ mới: thêm dòng vào bảng
  `departments` / `doc_types` (seed chỉ chạy khi bảng rỗng).
