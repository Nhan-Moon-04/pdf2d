# Deploy lên Ubuntu 24.04 — Port 1611

## Kiến trúc (không cần Nginx)

```
Internet :1611 → Gunicorn (0.0.0.0:1611) → Flask App
```

URL sau khi xong: **http://nthiennhan.duckdns.org:1611/**

---

## Bước 1 — Chuẩn bị máy chủ

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.12 python3.12-venv python3-pip git
```

---

## Bước 2 — Clone source từ GitHub

```bash
sudo mkdir -p /var/www/pdf2docx
sudo chown $USER:$USER /var/www/pdf2docx

git clone https://github.com/Nhan-Moon-04/pdf2d.git /var/www/pdf2docx
```

---

## Bước 3 — Cài đặt Python environment

```bash
cd /var/www/pdf2docx

python3.12 -m venv venv
source venv/bin/activate

# Cài pdf2docx từ source
pip install -e .

# Cài Flask + Gunicorn
pip install flask gunicorn

# Tạo thư mục lưu file
mkdir -p webapp/uploads webapp/outputs
```

---

## Bước 4 — Cấu hình Secret Key

```bash
cat > /var/www/pdf2docx/webapp/.env << 'EOF'
SECRET_KEY=0989057191
EOF

chmod 600 /var/www/pdf2docx/webapp/.env
```

---

## Bước 5 — Tạo Systemd service

```bash
sudo nano /etc/systemd/system/pdf2docx.service
```

Dán nội dung sau:

```ini
[Unit]
Description=PDF2DOCX Web App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/pdf2docx/webapp
EnvironmentFile=/var/www/pdf2docx/webapp/.env
ExecStart=/var/www/pdf2docx/venv/bin/gunicorn \
    --workers 2 \
    --bind 0.0.0.0:1611 \
    --timeout 300 \
    --access-logfile /var/log/pdf2docx/access.log \
    --error-logfile /var/log/pdf2docx/error.log \
    app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Tạo thư mục log
sudo mkdir -p /var/log/pdf2docx
sudo chown www-data:www-data /var/log/pdf2docx

# Phân quyền thư mục app
sudo chown -R www-data:www-data /var/www/pdf2docx

# Kích hoạt & start service
sudo systemctl daemon-reload
sudo systemctl enable pdf2docx
sudo systemctl start pdf2docx

# Kiểm tra
sudo systemctl status pdf2docx
```

---

## Bước 6 — Mở firewall cổng 1611

```bash
sudo ufw allow OpenSSH
sudo ufw allow 1611/tcp
sudo ufw enable
sudo ufw status
```

---

## Bước 7 — Kiểm tra

```bash
# Test ngay trên server
curl http://localhost:1611/

# Xem log nếu có lỗi
sudo journalctl -u pdf2docx -f
sudo tail -f /var/log/pdf2docx/error.log
```

Truy cập: **http://nthiennhan.duckdns.org:1611/**
Đăng nhập: `admin` / `nguyennhan2004`

---

## Cập nhật code từ GitHub

```bash
cd /var/www/pdf2docx
git pull

# Nếu có thay đổi requirements:
source venv/bin/activate
pip install -e .

# Khởi động lại app
sudo systemctl restart pdf2docx
```

---

## Lệnh quản lý nhanh

| Tác vụ | Lệnh |
|--------|-------|
| Start | `sudo systemctl start pdf2docx` |
| Stop | `sudo systemctl stop pdf2docx` |
| Restart | `sudo systemctl restart pdf2docx` |
| Xem log | `sudo journalctl -u pdf2docx -f` |
| Xem log lỗi | `sudo tail -f /var/log/pdf2docx/error.log` |

---

## Nếu đang dùng Nginx — xoá đi cho sạch

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```
