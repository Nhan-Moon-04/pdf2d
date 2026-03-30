# Deploy Stirling-PDF — Port 8081

Chạy song song với pdf2d (:8080) trên cùng VPS Ubuntu 24.04.

```
Internet :8081 → Docker container stirling-pdf (nội bộ :8080)
```

URL sau khi xong: **http://nthiennhan.duckdns.org:8081/**

---

## Bước 1 — Cài Docker (nếu chưa có)

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
     -o /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cho phép user hiện tại dùng docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

## Bước 2 — Chạy container

```bash
docker run -d \
  -p 8081:8080 \
  --name stirling-pdf \
  --restart unless-stopped \
  stirlingtools/stirling-pdf:latest
```

> Stirling-PDF lắng nghe nội bộ ở cổng `8080`, ta ánh xạ ra cổng `8081` của host.

Kiểm tra container đang chạy:

```bash
docker ps
docker logs stirling-pdf
```

---

## Bước 3 — Mở firewall cổng 8081

```bash
sudo ufw allow 8081/tcp
sudo ufw status
```

---

## Bước 4 — Kiểm tra

```bash
curl -I http://localhost:8081/
```

Truy cập: **http://nthiennhan.duckdns.org:8081/**
Chọn **Compress PDF** → kéo file vào → chọn mức nén → tải về.

---

## Mức nén Ghostscript (Stirling-PDF dùng bên dưới)

| Mức | DPI | Dùng cho |
|-----|-----|----------|
| Screen | ~72 dpi | Nén mạnh nhất, chỉ xem màn hình |
| Ebook | ~150 dpi | **Khuyên dùng** — cân bằng tốt |
| Printer | ~300 dpi | In ấn chất lượng cao |
| Prepress | ~300+ dpi | Giữ gần nguyên bản |

---

## Lệnh quản lý nhanh

| Tác vụ | Lệnh |
|--------|-------|
| Start | `docker start stirling-pdf` |
| Stop | `docker stop stirling-pdf` |
| Restart | `docker restart stirling-pdf` |
| Xem log | `docker logs -f stirling-pdf` |
| Xem trạng thái | `docker ps` |
| Cập nhật image | xem mục bên dưới |

---

## Cập nhật lên phiên bản mới

```bash
docker pull stirlingtools/stirling-pdf:latest
docker stop stirling-pdf
docker rm stirling-pdf
docker run -d \
  -p 8081:8080 \
  --name stirling-pdf \
  --restart unless-stopped \
  stirlingtools/stirling-pdf:latest
```

---

## Tổng quan 2 dịch vụ trên VPS

| Dịch vụ | Port | Mục đích |
|---------|------|----------|
| pdf2d (Gunicorn) | 8080 | PDF → Word, trích xuất bảng |
| Stirling-PDF (Docker) | 8081 | Nén PDF, và 50+ công cụ PDF khác |


docker run -d \
  -p 8081:8080 \
  --name stirling-pdf \
  --restart unless-stopped \
  -e SECURITY_ENABLE_LOGIN=true \
  -e DOCKER_ENABLE_SECURITY=true \
  stirlingtools/stirling-pdf:latest