const Search = (() => {
  function init() {
    const today = App.today();
    document.getElementById("searchStart").value = today;
    document.getElementById("searchEnd").value = today;
    document.getElementById("searchPhotosBtn").addEventListener("click", searchPhotos);
    document.getElementById("loadPdfArchiveBtn").addEventListener("click", loadPdfArchive);
    const summaryButton = document.getElementById("loadSummaryBtn");
    if (summaryButton) summaryButton.addEventListener("click", loadSummary);
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
    target.innerHTML = items.map((item) => Photo.cardHtml(item, 0, false).replace(
      "</div>\n      </article>",
      `<button type="button" class="danger small" data-delete-photo="${App.escape(item.photo_id)}">삭제</button></div>\n      </article>`
    )).join("");
    target.querySelectorAll("[data-delete-photo]").forEach((button) => {
      button.addEventListener("click", () => deletePhoto(button.dataset.deletePhoto));
    });
  }

  async function deletePhoto(photoId) {
    if (!photoId) return;
    if (!window.confirm("선택한 사진을 DB와 Drive에서 삭제할까요?")) return;
    const result = await Api.request("delete_photo", { photo_id: photoId });
    if (result.status === "ok") {
      App.toast("사진을 삭제했습니다.");
      searchPhotos();
      return;
    }
    App.toast(result.message || "사진 삭제에 실패했습니다.");
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
