import csv
import io
import os
import uuid
import threading
import time
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
import re

from flask import (
    Flask, render_template, request, redirect, url_for,
    session, send_from_directory, flash, jsonify
)
from werkzeug.utils import secure_filename

# Tự đọc file .env nếu có (Windows & Linux)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

# ---------------------------------------------------------------------------
# App configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "nguyennhan2004"

FILE_LIFETIME_DAYS = 10          # auto-delete after N days
CLEANUP_INTERVAL_SECONDS = 3600  # run cleanup every hour

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "pdf2docx-secret-2024-xK9mP3")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Background cleanup
# ---------------------------------------------------------------------------

def cleanup_old_files():
    """Delete upload/output files older than FILE_LIFETIME_DAYS."""
    cutoff = datetime.now() - timedelta(days=FILE_LIFETIME_DAYS)
    for directory in (UPLOAD_DIR, OUTPUT_DIR):
        for fp in directory.iterdir():
            if fp.is_file():
                mtime = datetime.fromtimestamp(fp.stat().st_mtime)
                if mtime < cutoff:
                    try:
                        fp.unlink()
                    except OSError:
                        pass


def cleanup_loop():
    while True:
        time.sleep(CLEANUP_INTERVAL_SECONDS)
        cleanup_old_files()


# Start background cleanup thread
_cleaner = threading.Thread(target=cleanup_loop, daemon=True)
_cleaner.start()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return redirect(url_for("dashboard"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("logged_in"):
        return redirect(url_for("dashboard"))
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session["logged_in"] = True
            session["username"] = username
            return redirect(url_for("dashboard"))
        error = "Tên đăng nhập hoặc mật khẩu không đúng."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", username=session.get("username"))


@app.route("/convert", methods=["POST"])
@login_required
def convert():
    if "pdf_file" not in request.files:
        return jsonify({"success": False, "error": "Chưa chọn file PDF."}), 400

    pdf_file = request.files["pdf_file"]
    if pdf_file.filename == "":
        return jsonify({"success": False, "error": "Chưa chọn file PDF."}), 400

    if not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"success": False, "error": "Chỉ chấp nhận file .pdf."}), 400

    # Save uploaded PDF
    uid = uuid.uuid4().hex
    original_name = Path(secure_filename(pdf_file.filename)).stem
    pdf_path = UPLOAD_DIR / f"{uid}.pdf"
    docx_name = f"{original_name}_{uid[:8]}.docx"
    docx_path = OUTPUT_DIR / docx_name

    pdf_file.save(str(pdf_path))

    # Optional parameters
    password = request.form.get("password") or None
    start = int(request.form.get("start") or 0)
    end_val = request.form.get("end")
    end = int(end_val) if end_val else None
    pages_raw = request.form.get("pages", "").strip()
    pages = None
    if pages_raw:
        try:
            pages = [int(p.strip()) for p in pages_raw.split(",") if p.strip()]
        except ValueError:
            return jsonify({"success": False, "error": "Danh sách trang không hợp lệ."}), 400

    # Perform conversion
    try:
        import sys
        sys.path.insert(0, str(BASE_DIR.parent))
        from pdf2docx import Converter

        cv = Converter(str(pdf_path), password=password)
        cv.convert(
            str(docx_path),
            start=start,
            end=end,
            pages=pages,
            ignore_page_error=True,
        )
        cv.close()
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    return jsonify({
        "success": True,
        "filename": docx_name,
        "download_url": url_for("download_file", filename=docx_name),
    })


@app.route("/download/<filename>")
@login_required
def download_file(filename):
    safe = secure_filename(filename)
    return send_from_directory(
        str(OUTPUT_DIR),
        safe,
        as_attachment=True,
        download_name=safe,
    )


@app.route("/extract-tables", methods=["POST"])
@login_required
def extract_tables():
    if "pdf_file" not in request.files:
        return jsonify({"success": False, "error": "Chưa chọn file PDF."}), 400

    pdf_file = request.files["pdf_file"]
    if pdf_file.filename == "":
        return jsonify({"success": False, "error": "Chưa chọn file PDF."}), 400

    if not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"success": False, "error": "Chỉ chấp nhận file .pdf."}), 400

    uid = uuid.uuid4().hex
    original_name = Path(secure_filename(pdf_file.filename)).stem
    pdf_path = UPLOAD_DIR / f"{uid}.pdf"
    csv_name = f"{original_name}_{uid[:8]}.csv"
    csv_path = OUTPUT_DIR / csv_name

    pdf_file.save(str(pdf_path))

    password = request.form.get("password") or None
    start = int(request.form.get("start") or 0)
    end_val = request.form.get("end")
    end = int(end_val) if end_val else None
    pages_raw = request.form.get("pages", "").strip()
    pages = None
    if pages_raw:
        try:
            pages = [int(p.strip()) for p in pages_raw.split(",") if p.strip()]
        except ValueError:
            return jsonify({"success": False, "error": "Danh sách trang không hợp lệ."}), 400

    try:
        import sys
        sys.path.insert(0, str(BASE_DIR.parent))
        from pdf2docx import Converter

        cv = Converter(str(pdf_path), password=password)
        tables = cv.extract_tables(start=start, end=end, pages=pages)
        cv.close()
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    if not tables:
        return jsonify({"success": False, "error": "Không tìm thấy bảng nào trong file PDF."}), 400

    # Write all tables to a single CSV, separated by blank lines
    with open(str(csv_path), "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        for idx, table in enumerate(tables):
            writer.writerow([f"=== Bảng {idx + 1} ==="])
            for row in table:
                writer.writerow(row)
            writer.writerow([])  # blank line between tables

    return jsonify({
        "success": True,
        "filename": csv_name,
        "table_count": len(tables),
        "download_url": url_for("download_file", filename=csv_name),
    })


@app.route("/files")
@login_required
def list_files():
    """Return list of available output files as JSON."""
    files = []
    allowed_exts = {".docx", ".csv", ".pdf"}
    for fp in sorted(OUTPUT_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if fp.is_file() and fp.suffix in allowed_exts:
            mtime = datetime.fromtimestamp(fp.stat().st_mtime)
            expire = mtime + timedelta(days=FILE_LIFETIME_DAYS)
            files.append({
                "name": fp.name,
                "type": fp.suffix.lstrip("."),
                "size_kb": round(fp.stat().st_size / 1024, 1),
                "created": mtime.strftime("%d/%m/%Y %H:%M"),
                "expires": expire.strftime("%d/%m/%Y %H:%M"),
                "download_url": url_for("download_file", filename=fp.name),
            })
    return jsonify(files)


@app.route("/delete/<filename>", methods=["DELETE"])
@login_required
def delete_file(filename):
    safe = secure_filename(filename)
    fp = OUTPUT_DIR / safe
    if fp.exists():
        fp.unlink()
        uid_match = re.search(r"_([a-f0-9]{8})_", safe)
        if uid_match:
            uid = uid_match.group(1)
            for up in UPLOAD_DIR.glob(f"*{uid}*"):
                up.unlink(missing_ok=True)
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "File không tồn tại."}), 404


@app.route("/protect-pdf", methods=["POST"])
@login_required
def protect_pdf():
    if "pdf_file" not in request.files:
        return jsonify({"success": False, "error": "Chưa chọn file PDF."}), 400

    pdf_file = request.files["pdf_file"]
    if pdf_file.filename == "":
        return jsonify({"success": False, "error": "Chưa chọn file PDF."}), 400

    if not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"success": False, "error": "Chỉ chấp nhận file .pdf."}), 400

    # --- Get options from form ---
    user_pass = request.form.get("user_password")
    owner_pass = request.form.get("owner_password") or user_pass

    if not user_pass:
        return jsonify({"success": False, "error": "Mật khẩu người dùng không được để trống."}), 400

    allow_print = request.form.get("allow_print") == "true"
    allow_copy = request.form.get("allow_copy") == "true"
    allow_modify = request.form.get("allow_modify") == "true"

    # --- Save uploaded file ---
    uid = uuid.uuid4().hex
    original_name = Path(secure_filename(pdf_file.filename)).stem
    pdf_path = UPLOAD_DIR / f"{uid}_unprotected.pdf"
    protected_name = f"{original_name}_{uid[:8]}_protected.pdf"
    protected_path = OUTPUT_DIR / protected_name

    pdf_file.save(str(pdf_path))

    # --- Apply protection using pikepdf ---
    try:
        import pikepdf

        permissions = pikepdf.Permissions(
            extract=allow_copy,
            modify_form=allow_modify,
            modify_annotation=allow_modify,
            modify_other=allow_modify,
            print_highres=allow_print,
            print_lowres=allow_print,
        )

        with pikepdf.open(pdf_path) as pdf:
            pdf.save(
                str(protected_path),
                encryption=pikepdf.Encryption(
                    user=user_pass,
                    owner=owner_pass,
                    allow=permissions,
                    R=6,  # AES-256
                ),
            )
    except Exception as exc:
        # Clean up temp file on error
        pdf_path.unlink(missing_ok=True)
        return jsonify({"success": False, "error": f"Lỗi khi đặt mật khẩu: {exc}"}), 500
    finally:
        # Clean up original unprotected file
        pdf_path.unlink(missing_ok=True)


    return jsonify({
        "success": True,
        "filename": protected_name,
        "download_url": url_for("download_file", filename=protected_name),
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
