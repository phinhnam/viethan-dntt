# Đề nghị thanh toán / Hoàn ứng (TCKT-DNTT-BM01)

Ứng dụng web lập **Đề nghị thanh toán / Hoàn ứng** cho Việt Hàn: nhập công nợ,
chi tiết thanh toán, tự tính số tiền hoàn ứng/thanh toán, đổi số thành chữ
tiếng Việt, đính kèm chứng từ (kéo-thả tự phân loại) và in / xuất PDF.

Dự án tổ chức theo chuẩn Flask application package.

## Cấu trúc dự án

```
dnttviethan/
├── venv/                 # Môi trường ảo (tự tạo, không commit)
├── .gitignore            # Loại trừ file rác, .env, venv
├── requirements.txt      # Flask, python-dotenv, gunicorn, pytest
├── .env.example          # Mẫu biến môi trường (sao chép thành .env)
├── app/                  # Mã nguồn chính
│   ├── __init__.py       # Application factory (create_app)
│   ├── main.py           # Điểm khởi chạy (entry point)
│   ├── routes.py         # Đường dẫn: trang chủ + API phụ trợ
│   ├── static/           # Tài nguyên tĩnh
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   ├── format.js           # Định dạng & phân tích số tiền VN
│   │   │   ├── number-to-words.js  # Đổi số sang chữ tiếng Việt
│   │   │   ├── calculations.js     # Tính bảng công nợ & thanh toán
│   │   │   ├── logo.js             # Chọn logo (localStorage)
│   │   │   ├── documents.js        # Chứng từ + kéo-thả phân loại
│   │   │   └── main.js             # Khởi tạo, gọi API cấp số phiếu
│   │   └── img/
│   │       ├── viet-han.png
│   │       └── viet-han-cnc.png
│   └── templates/        # Giao diện (Jinja2)
│       ├── base.html     # Layout dùng chung
│       └── index.html    # Trang biểu mẫu chính
└── tests/                # Unit test cho backend
    └── test_routes.py
```

## Kiến trúc

- **Backend (Flask)**: chỉ phục vụ trang, tài nguyên tĩnh và API phụ trợ
  (cấp số phiếu, health check). Không xử lý nghiệp vụ thanh toán.
- **Frontend (JS thuần)**: toàn bộ tính toán nghiệp vụ (công nợ, hoàn ứng,
  thanh toán, đổi số sang chữ) chạy phía client, không phụ thuộc thư viện ngoài.

## Cài đặt & chạy

Yêu cầu: Python 3.10+.

```bash
# 1) Tạo môi trường ảo & cài thư viện
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2) Tạo file biến môi trường
cp .env.example .env               # Windows: copy .env.example .env

# 3) Chạy máy chủ phát triển (từ thư mục gốc dự án)
python -m app.main
```

Mở trình duyệt tại http://127.0.0.1:5000

Chạy production với gunicorn:

```bash
gunicorn "app.main:app" --bind 0.0.0.0:8000
```

## Kiểm thử

```bash
pytest
```

## API

| Method | Đường dẫn          | Mô tả                                            |
|--------|--------------------|--------------------------------------------------|
| GET    | `/`                | Trang biểu mẫu                                   |
| GET    | `/api/health`      | Kiểm tra máy chủ (`{"status":"ok"}`)             |
| GET    | `/api/next-number` | Cấp số phiếu `DNTT-YYYY-NNNN` (đếm trong bộ nhớ) |

## Biến môi trường (.env)

| Biến                | Mặc định    | Ý nghĩa                       |
|---------------------|-------------|-------------------------------|
| `HOST`              | `127.0.0.1` | Địa chỉ lắng nghe             |
| `PORT`              | `5000`      | Cổng                          |
| `FLASK_DEBUG`       | `1`         | Chế độ debug (`0` để tắt)     |
| `DOC_NUMBER_PREFIX` | `DNTT`      | Tiền tố số phiếu              |
