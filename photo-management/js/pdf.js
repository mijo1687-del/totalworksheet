const Pdf = (() => {
  const state = {
    creating: false
  };

  function init() {
    const today = App.today();
    document.getElementById("pdfDate").value = today;
    document.getElementById("createPdfBtn").addEventListener("click", create);
    document.getElementById("pdfDate").addEventListener("change", updateCount);
    document.getElementById("pdfCategory").addEventListener("change", updateCount);
    updateCount();
  }

  async function updateCount() {
    const result = await Api.request("search_photos", {
      start_date: document.getElementById("pdfDate").value,
      end_date: document.getElementById("pdfDate").value,
      category: document.getElementById("pdfCategory").value
    });
    document.getElementById("pdfCountBox").textContent = `사진수: ${(result.items || []).length}장`;
  }

  async function create() {
    if (state.creating) return;
    const photoDate = document.getElementById("pdfDate").value;
    const category = document.getElementById("pdfCategory").value;
    setCreating(true);
    await waitForPaint();
    try {
      const result = await Api.request("create_pdf", {
        photo_date: photoDate,
        date_code: Api.dateCode(photoDate),
        category,
        writer: document.getElementById("pdfWriter").value.trim(),
        layout_mode: document.getElementById("pdfLayoutMode").value,
        site_name: Api.CONFIG.siteName
      });
      if (result.status === "ok") {
        renderArchive([result.item], "pdfResult");
        App.toast(result.item.pdf_url ? "사진대장 PDF를 생성했습니다." : result.message || "PDF 기록을 만들었습니다.");
        return;
      }
      App.toast(result.message || "PDF 생성에 실패했습니다.");
    } catch (error) {
      App.toast("PDF 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  function setCreating(isCreating) {
    state.creating = isCreating;
    const button = document.getElementById("createPdfBtn");
    button.disabled = isCreating;
    button.textContent = isCreating ? "생성중..." : "PDF 생성";
  }

  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function renderArchive(items, targetId) {
    const target = document.getElementById(targetId);
    if (!items.length) {
      target.className = "result-box";
      target.textContent = "생성된 PDF가 없습니다.";
      return;
    }
    target.className = "result-box";
    target.innerHTML = items.map((item) => `
      <div class="pdf-item">
        <div>
          <strong>${App.escape(item.category_name)}</strong>
          <span>${App.escape(item.photo_date)} · 사진 ${App.escape(item.photo_count)}장</span>
          <span>${App.escape(item.pdf_file_name || "")}</span>
        </div>
        <div class="actions">
          ${item.pdf_url ? `<a href="${App.escape(item.pdf_url)}" target="_blank" rel="noreferrer"><button type="button">PDF 열기</button></a>` : ""}
        </div>
      </div>
    `).join("");
  }

  return { init, updateCount, renderArchive };
})();
