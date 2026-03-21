/* ---------------------------------------------------------------
   Dashboard JS — PDF2DOCX Web App
--------------------------------------------------------------- */

const dropZone    = document.getElementById("dropZone");
const pdfInput    = document.getElementById("pdfInput");
const convertBtn  = document.getElementById("convertBtn");
const progressWrap = document.getElementById("progressWrap");
const resultArea  = document.getElementById("resultArea");
const selectedFileName = document.getElementById("selectedFileName");

let selectedFile = null;

// ── File selection ────────────────────────────────────────────
pdfInput.addEventListener("change", () => {
  handleFile(pdfInput.files[0]);
});

dropZone.addEventListener("click", (e) => {
  if (e.target.closest("label") || e.target === pdfInput) return;
  pdfInput.click();
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showResult(false, "Chỉ chấp nhận file .pdf");
    return;
  }
  selectedFile = file;
  selectedFileName.textContent = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  convertBtn.disabled = false;
  resultArea.innerHTML = "";
}

// ── Convert ──────────────────────────────────────────────────
convertBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append("pdf_file", selectedFile);

  const password = document.getElementById("pdfPassword").value.trim();
  const start    = document.getElementById("startPage").value;
  const end      = document.getElementById("endPage").value.trim();
  const pages    = document.getElementById("pages").value.trim();

  if (password) formData.append("password", password);
  formData.append("start", start || "0");
  if (end)   formData.append("end", end);
  if (pages) formData.append("pages", pages);

  convertBtn.disabled = true;
  progressWrap.classList.remove("d-none");
  resultArea.innerHTML = "";

  try {
    const res  = await fetch("/convert", { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      showResult(true, `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <i class="bi bi-check-circle-fill text-success me-1"></i>
            <strong>Chuyển đổi thành công!</strong>
            <div class="text-muted small mt-1">${data.filename}</div>
          </div>
          <a href="${data.download_url}" class="btn btn-success download-btn">
            <i class="bi bi-download me-1"></i>Tải xuống
          </a>
        </div>
      `);
      loadFiles();
    } else {
      showResult(false, data.error || "Lỗi không xác định.");
    }
  } catch (err) {
    showResult(false, "Không thể kết nối máy chủ.");
  } finally {
    progressWrap.classList.add("d-none");
    convertBtn.disabled = false;
  }
});

function showResult(success, html) {
  const cls = success ? "alert-success" : "alert-danger";
  resultArea.innerHTML = `<div class="alert ${cls}">${html}</div>`;
}

// ── File list ─────────────────────────────────────────────────
async function loadFiles() {
  const listEl  = document.getElementById("fileList");
  const emptyEl = document.getElementById("fileListEmpty");

  try {
    const res   = await fetch("/files");
    const files = await res.json();

    listEl.innerHTML = "";

    if (files.length === 0) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    files.forEach((f) => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="flex-grow-1 overflow-hidden">
            <div class="file-name text-truncate" title="${f.name}">${f.name}</div>
            <div class="file-meta">
              ${f.size_kb} KB &nbsp;·&nbsp;
              <i class="bi bi-calendar3"></i> ${f.created} &nbsp;·&nbsp;
              <i class="bi bi-hourglass-split"></i> hết hạn ${f.expires}
            </div>
          </div>
          <div class="d-flex gap-1 flex-shrink-0">
            <a href="${f.download_url}" class="btn btn-sm btn-outline-primary" title="Tải xuống">
              <i class="bi bi-download"></i>
            </a>
            <button
              class="btn btn-sm btn-outline-danger"
              title="Xoá"
              onclick="deleteFile('${f.name}', this)"
            >
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      `;
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error("loadFiles error:", err);
  }
}

async function deleteFile(filename, btn) {
  if (!confirm(`Xoá file "${filename}"?`)) return;
  btn.disabled = true;
  try {
    const res  = await fetch(`/delete/${encodeURIComponent(filename)}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      loadFiles();
    } else {
      alert(data.error || "Không thể xoá file.");
    }
  } catch (err) {
    alert("Lỗi kết nối.");
  }
}

// Load file list on page load
loadFiles();
