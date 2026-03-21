#!/bin/bash
# update.sh — Pull code mới từ GitHub và restart app
# Dùng: bash /var/www/pdf2docx/update.sh

set -e

APP_DIR="/var/www/pdf2docx"
SERVICE="pdf2docx"

echo "==> Git pull..."
cd "$APP_DIR"
git pull origin main

echo "==> Cài dependencies (nếu có thay đổi)..."
source "$APP_DIR/venv/bin/activate"
pip install -e . -q
pip install flask gunicorn -q

echo "==> Restart service..."
systemctl restart "$SERVICE"
sleep 2
systemctl status "$SERVICE" --no-pager

echo ""
echo "Done! App chạy tại http://nthiennhan.duckdns.org:8080/"
