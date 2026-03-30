/* ---------------------------------------------------------------
   Dashboard JS — PDF2DOCX Web App
--------------------------------------------------------------- */

// ── Tab 1: PDF → DOCX ─────────────────────────────────────────

const dropZone         = document.getElementById("dropZone");
const pdfInput         = document.getElementById("pdfInput");
const convertBtn       = document.getElementById("convertBtn");
const progressWrap     = document.getElementById("progressWrap");
const resultArea       = document.getElementById("resultArea");
const selectedFileName = document.getElementById("selectedFileName");

let selectedFile = null;

pdfInput.addEventListener("change", () => handleFile(pdfInput.files[0]));

dropZone.addEventListener("click", (e) => {
  if (e.target.closest("label") || e.target === pdfInput) return;
  pdfInput.click();
});
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showResult(resultArea, false, "Chỉ chấp nhận file .pdf");
    return;
  }
  selectedFile = file;
  selectedFileName.textContent = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  convertBtn.disabled = false;
  resultArea.innerHTML = "";
}

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
      showResult(resultArea, true, `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <i class="bi bi-check-circle-fill text-success me-1"></i>
            <strong>Chuyển đổi thành công!</strong>
            <div class="text-muted small mt-1">${data.filename}</div>
          </div>
          <a href="${data.download_url}" class="btn btn-success download-btn">
            <i class="bi bi-download me-1"></i>Tải xuống .docx
          </a>
        </div>
      `);
      loadFiles();
    } else {
      showResult(resultArea, false, data.error || "Lỗi không xác định.");
    }
  } catch (err) {
    showResult(resultArea, false, "Không thể kết nối máy chủ.");
  } finally {
    progressWrap.classList.add("d-none");
    convertBtn.disabled = false;
  }
});


// ── Tab 2: Extract Tables → CSV ───────────────────────────────

const dropZone2         = document.getElementById("dropZone2");
const pdfInput2         = document.getElementById("pdfInput2");
const extractBtn        = document.getElementById("extractBtn");
const progressWrap2     = document.getElementById("progressWrap2");
const resultArea2       = document.getElementById("resultArea2");
const selectedFileName2 = document.getElementById("selectedFileName2");

let selectedFile2 = null;

pdfInput2.addEventListener("change", () => handleFile2(pdfInput2.files[0]));

dropZone2.addEventListener("click", (e) => {
  if (e.target.closest("label") || e.target === pdfInput2) return;
  pdfInput2.click();
});
dropZone2.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone2.classList.add("drag-over");
});
dropZone2.addEventListener("dragleave", () => dropZone2.classList.remove("drag-over"));
dropZone2.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone2.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleFile2(e.dataTransfer.files[0]);
});

function handleFile2(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showResult(resultArea2, false, "Chỉ chấp nhận file .pdf");
    return;
  }
  selectedFile2 = file;
  selectedFileName2.textContent = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  extractBtn.disabled = false;
  resultArea2.innerHTML = "";
}

extractBtn.addEventListener("click", async () => {
  if (!selectedFile2) return;

  const formData = new FormData();
  formData.append("pdf_file", selectedFile2);

  const password = document.getElementById("pdfPassword2").value.trim();
  const start    = document.getElementById("startPage2").value;
  const end      = document.getElementById("endPage2").value.trim();
  const pages    = document.getElementById("pages2").value.trim();

  if (password) formData.append("password", password);
  formData.append("start", start || "0");
  if (end)   formData.append("end", end);
  if (pages) formData.append("pages", pages);

  extractBtn.disabled = true;
  progressWrap2.classList.remove("d-none");
  resultArea2.innerHTML = "";

  try {
    const res  = await fetch("/extract-tables", { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      showResult(resultArea2, true, `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <i class="bi bi-check-circle-fill text-success me-1"></i>
            <strong>Trích xuất thành công!</strong>
            <div class="text-muted small mt-1">
              Tìm thấy <strong>${data.table_count}</strong> bảng &nbsp;·&nbsp; ${data.filename}
            </div>
          </div>
          <a href="${data.download_url}" class="btn btn-success download-btn">
            <i class="bi bi-download me-1"></i>Tải xuống .csv
          </a>
        </div>
      `);
      loadFiles();
    } else {
      showResult(resultArea2, false, data.error || "Lỗi không xác định.");
    }
  } catch (err) {
    showResult(resultArea2, false, "Không thể kết nối máy chủ.");
  } finally {
    progressWrap2.classList.add("d-none");
    extractBtn.disabled = false;
  }
});


// ── Tab 3: Set PDF Password ───────────────────────────────────

const dropZone3         = document.getElementById("dropZone3");
const pdfInput3         = document.getElementById("pdfInput3");
const protectBtn        = document.getElementById("protectBtn");
const progressWrap3     = document.getElementById("progressWrap3");
const resultArea3       = document.getElementById("resultArea3");
const selectedFileName3 = document.getElementById("selectedFileName3");

let selectedFile3 = null;

pdfInput3.addEventListener("change", () => handleFile3(pdfInput3.files[0]));

dropZone3.addEventListener("click", (e) => {
  if (e.target.closest("label") || e.target === pdfInput3) return;
  pdfInput3.click();
});
dropZone3.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone3.classList.add("drag-over");
});
dropZone3.addEventListener("dragleave", () => dropZone3.classList.remove("drag-over"));
dropZone3.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone3.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleFile3(e.dataTransfer.files[0]);
});

function handleFile3(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showResult(resultArea3, false, "Chỉ chấp nhận file .pdf");
    return;
  }
  selectedFile3 = file;
  selectedFileName3.textContent = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  protectBtn.disabled = false;
  resultArea3.innerHTML = "";
}

protectBtn.addEventListener("click", async () => {
  if (!selectedFile3) return;

  const formData = new FormData();
  formData.append("pdf_file", selectedFile3);

  const userPassword = document.getElementById("userPassword3").value;
  const ownerPassword = document.getElementById("ownerPassword3").value;
  const allowPrinting = document.getElementById("allowPrinting").checked;
  const allowCopy = document.getElementById("allowCopy").checked;
  const allowModify = document.getElementById("allowModify").checked;

  if (!userPassword) {
      showResult(resultArea3, false, "Mật khẩu người dùng không được để trống.");
      return;
  }

  formData.append("user_password", userPassword);
  formData.append("owner_password", ownerPassword);
  formData.append("allow_print", allowPrinting);
  formData.append("allow_copy", allowCopy);
  formData.append("allow_modify", allowModify);

  protectBtn.disabled = true;
  progressWrap3.classList.remove("d-none");
  resultArea3.innerHTML = "";

  try {
    const res  = await fetch("/protect-pdf", { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      showResult(resultArea3, true, `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <i class="bi bi-check-circle-fill text-success me-1"></i>
            <strong>Đặt mật khẩu thành công!</strong>
            <div class="text-muted small mt-1">${data.filename}</div>
          </div>
          <a href="${data.download_url}" class="btn btn-success download-btn">
            <i class="bi bi-download me-1"></i>Tải xuống PDF
          </a>
        </div>
      `);
      loadFiles();
    } else {
      showResult(resultArea3, false, data.error || "Lỗi không xác định.");
    }
  } catch (err) {
    showResult(resultArea3, false, "Không thể kết nối máy chủ.");
  } finally {
    progressWrap3.classList.add("d-none");
    protectBtn.disabled = false;
  }
});


// ── Shared helpers ────────────────────────────────────────────

function showResult(container, success, html) {
  const cls = success ? "alert-success" : "alert-danger";
  container.innerHTML = `<div class="alert ${cls}">${html}</div>`;
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
      const isCsv  = f.type === "csv";
      const isPdf = f.type === "pdf";
      let icon, badge;

      if (isCsv) {
          icon = "bi-file-earmark-spreadsheet text-success";
          badge = '<span class="badge bg-success ms-1" style="font-size:0.65rem">CSV</span>';
      } else if (isPdf) {
          icon = "bi-file-earmark-lock text-warning";
          badge = '<span class="badge bg-warning ms-1" style="font-size:0.65rem">PDF</span>';
      } else {
          icon = "bi-file-earmark-word text-primary";
          badge = '<span class="badge bg-primary ms-1" style="font-size:0.65rem">DOCX</span>';
      }


      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="flex-grow-1 overflow-hidden">
            <div class="d-flex align-items-center gap-1">
              <i class="bi ${icon}"></i>
              <span class="file-name text-truncate" title="${f.name}">${f.name}</span>
              ${badge}
            </div>
            <div class="file-meta mt-1">
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
    btn.disabled = false;
  }
}

// Load file list on page load
loadFiles();
