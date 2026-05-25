const Summary = (() => {
  function init() {
    document.getElementById("searchSummaryBtn").addEventListener("click", search);
    document.getElementById("loadArchiveBtn").addEventListener("click", loadArchive);
  }

  async function search() {
    const filters = {
      period: document.getElementById("periodFilter").value,
      trade: document.getElementById("tradeFilter").value,
      material: document.getElementById("materialFilter").value,
      equipment: document.getElementById("equipmentFilter").value
    };
    const result = await Api.request("search_summary", { filters });
    const target = document.getElementById("summaryResult");

    if (!result.items || !result.items.length) {
      target.textContent = result.message || "조회 결과가 없습니다.";
      return;
    }

    target.innerHTML = result.items.map((group) => `
      <section class="summary-group">
        <h3>${Master.escapeHtml(group.title)}</h3>
        <table class="print-table">
          <thead><tr><th>구분</th><th>누계</th></tr></thead>
          <tbody>
            ${(group.rows || []).length ? group.rows.map((row) => `
              <tr>
                <td>${Master.escapeHtml(row.label)}</td>
                <td>${Master.escapeHtml(row.value)}</td>
              </tr>
            `).join("") : `<tr><td colspan="2">조회된 내용 없음</td></tr>`}
          </tbody>
        </table>
      </section>
    `).join("");
  }

  async function loadArchive() {
    const result = await Api.request("list_daily");
    const target = document.getElementById("archiveList");

    if (!result.items || !result.items.length) {
      target.textContent = "저장된 작업일보가 없습니다.";
      return;
    }

    target.innerHTML = result.items.map((item) => `
      <div class="pdf-item">
        <div>
          <strong>${Master.escapeHtml(item.daily_id)}</strong>
          <span>${Master.escapeHtml(item.work_date)} · ${Master.escapeHtml(item.site || "")}</span>
        </div>
        <div class="actions">
          <button type="button" data-load-daily="${Master.escapeHtml(item.daily_id)}">열기</button>
          <button type="button" class="danger" data-delete-daily="${Master.escapeHtml(item.daily_id)}">삭제</button>
        </div>
      </div>
    `).join("");

    target.querySelectorAll("[data-load-daily]").forEach((button) => {
      button.addEventListener("click", async () => {
        const result = await Api.request("get_daily", { daily_id: button.dataset.loadDaily });
        if (result.status !== "ok" || !result.item) {
          App.toast("작업일보를 불러오지 못했습니다.");
          return;
        }
        Daily.loadIntoForm(result.item);
        App.showView("dailyView");
        App.toast("작업일보를 불러왔습니다.");
      });
    });

    target.querySelectorAll("[data-delete-daily]").forEach((button) => {
      button.addEventListener("click", async () => {
        const dailyId = button.dataset.deleteDaily;
        if (!window.confirm(`${dailyId} 작업일보를 삭제할까요?`)) return;
        await Api.request("delete_daily", { daily_id: dailyId });
        App.toast("작업일보를 삭제했습니다.");
        loadArchive();
      });
    });
  }

  return {
    init,
    search
  };
})();
