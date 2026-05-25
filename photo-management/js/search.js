const Search = (() => {
  function init() {
    const today = App.today();
    document.getElementById("searchStart").value = today;
    document.getElementById("searchEnd").value = today;
    document.getElementById("searchPhotosBtn").addEventListener("click", searchPhotos);
    document.getElementById("loadPdfArchiveBtn").addEventListener("click", loadPdfArchive);
    document.getElementById("loadSummaryBtn").addEventListener("click", loadSummary);
  }

  async function searchPhotos() {
    const result = await Api.request("search_photos", {
      start_date: document.getElementById("searchStart").value,
      end_date: document.getElementById("searchEnd").value,
      category: document.getElementById("searchCategory").value,
      keyword: document.getElementById("searchKeyword").value
    });
    renderPhotos(result.items || []);
  }

  function renderPhotos(items) {
    const target = document.getElementById("photoResults");
    if (!items.length) {
      target.className = "photo-grid empty";
      target.textContent = "조회된 사진이 없습니다.";
      return;
    }
    target.className = "photo-grid";
    target.innerHTML = items.map((item) => Photo.cardHtml(item, 0, false)).join("");
  }

  async function loadPdfArchive() {
    const result = await Api.get("list_pdf");
    Pdf.renderArchive(result.items || [], "pdfArchiveList");
  }

  async function loadSummary() {
    const result = await Api.request("summary");
    const target = document.getElementById("summaryResult");
    const groups = result.items || [];
    target.innerHTML = groups.map((group) => `
      <section class="summary-group">
        <h3>${App.escape(group.title)}</h3>
        <table>
          <thead><tr><th>구분</th><th>사진수</th></tr></thead>
          <tbody>${(group.rows || []).map((row) => `<tr><td>${App.escape(row.label)}</td><td>${App.escape(row.value)}</td></tr>`).join("")}</tbody>
        </table>
      </section>
    `).join("");
  }

  return { init, searchPhotos, loadPdfArchive };
})();
