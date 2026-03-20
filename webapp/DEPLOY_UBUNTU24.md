# Hướng dẫn Deploy lên Ubuntu 24.04 LTS

## Kiến trúc

```
Internet → Nginx (80/443) → Gunicorn (127.0.0.1:5000) → Flask App
```

---

## 1. Chuẩn bị máy chủ

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.12 python3.12-venv python3-pip nginx git
```

---

## 2. Upload source code

```bash
# Tạo thư mục app
sudo mkdir -p /var/www/pdf2docx
sudo chown $USER:$USER /var/www/pdf2docx

# Clone hoặc copy project
git clone <your-repo-url> /var/www/pdf2docx
# HOẶC copy thủ công bằng scp:
# scp -r /path/to/pdf2docx user@server:/var/www/pdf2docx
```

---

## 3. Tạo môi trường ảo & cài dependencies

```bash
cd /var/www/pdf2docx

python3.12 -m venv venv
source venv/bin/activate

# Cài pdf2docx từ thư mục gốc
pip install -e .

# Cài Flask + Gunicorn
pip install flask gunicorn

# Tạo thư mục upload/output
mkdir -p webapp/uploads webapp/outputs
```

---

## 4. Cấu hình biến môi trường

```bash
# Tạo file .env (bảo mật secret key)
cat > /var/www/pdf2docx/webapp/.env << 'EOF'
SECRET_KEY=thay-bang-chuoi-ngau-nhien-rat-dai-va-phuc-tap
EOF

chmod 600 /var/www/pdf2docx/webapp/.env
```

---

## 5. Tạo Systemd service

```bash
sudo nano /etc/systemd/system/pdf2docx.service
```

Nội dung file service:

```ini
[Unit]
Description=PDF2DOCX Web App (Gunicorn)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/pdf2docx/webapp
EnvironmentFile=/var/www/pdf2docx/webapp/.env
ExecStart=/var/www/pdf2docx/venv/bin/gunicorn \
    --workers 2 \
    --bind 127.0.0.1:5000 \
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

# Kích hoạt service
sudo systemctl daemon-reload
sudo systemctl enable pdf2docx
sudo systemctl start pdf2docx

# Kiểm tra trạng thái
sudo systemctl status pdf2docx
```

---

## 6. Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/pdf2docx
```

Nội dung (HTTP — không có SSL):

```nginx
server {
    listen 80;
    server_name your-domain.com;   # hoặc IP máy chủ

    # Tăng giới hạn upload (100MB)
    client_max_body_size 100M;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
    }

    # Static files phục vụ trực tiếp qua Nginx (nhanh hơn)
    location /static/ {
        alias /var/www/pdf2docx/webapp/static/;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

```bash
# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/pdf2docx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Cài SSL với Let's Encrypt (khuyến nghị)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d your-domain.com

# Certbot tự động cập nhật Nginx config với SSL
# Tự gia hạn: chạy lệnh sau để kiểm tra
sudo certbot renew --dry-run
```

---

## 8. Cấu hình Nginx với SSL (sau khi có cert)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /static/ {
        alias /var/www/pdf2docx/webapp/static/;
        expires 7d;
    }
}
```

---

## 9. Cấu hình Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 10. Dọn dẹp file tự động (crontab)

File cũ đã được xóa tự động bởi background thread trong app.
Nếu muốn thêm lớp bảo vệ bằng crontab hệ thống:

```bash
sudo crontab -e
```

Thêm dòng sau (chạy lúc 3 giờ sáng mỗi ngày):

```cron
0 3 * * * find /var/www/pdf2docx/webapp/uploads -mtime +10 -delete
0 3 * * * find /var/www/pdf2docx/webapp/outputs -mtime +10 -delete
```

---

## 11. Quản lý & theo dõi

```bash
# Xem log app
sudo journalctl -u pdf2docx -f

# Xem log Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/pdf2docx/error.log

# Khởi động lại app
sudo systemctl restart pdf2docx

# Cập nhật code
cd /var/www/pdf2docx
git pull
sudo systemctl restart pdf2docx
```

---

## 12. Cấu hình nếu chạy local (không cần domain)

Truy cập qua IP máy chủ:

```bash
# Trong file Nginx, đổi server_name thành IP:
server_name 192.168.1.100;

# Hoặc bỏ qua Nginx, truy cập thẳng Gunicorn
# Mở port 5000
sudo ufw allow 5000/tcp

# Đổi bind address trong service file:
# --bind 0.0.0.0:5000
```

Rồi truy cập: `http://192.168.1.100:5000`

---

## Tóm tắt nhanh

| Bước | Lệnh |
|------|-------|
| Start app | `sudo systemctl start pdf2docx` |
| Stop app  | `sudo systemctl stop pdf2docx` |
| Restart   | `sudo systemctl restart pdf2docx` |
| Xem log   | `sudo journalctl -u pdf2docx -f` |
| Reload Nginx | `sudo systemctl reload nginx` |

**URL đăng nhập:** `http://your-domain.com` (hoặc IP)
**Tài khoản:** `admin` / `nguyennhan2004`
