const DailyKeys = (() => {
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function fromDate(workDate) {
    const date_code = workDate.replaceAll("-", "");
    return {
      date_code,
      hub_key: `DAY-${date_code}`,
      daily_id: `DR-${date_code}-001`
    };
  }

  return { today, fromDate };
})();

const Daily = (() => {
  const state = {
    photoLinks: []
  };

  function init() {
    const workDate = document.getElementById("workDate");
    workDate.value = DailyKeys.today();
    workDate.addEventListener("change", updateKeys);
    updateKeys();
    applySiteDefault();

    document.getElementById("addWorkBtn").addEventListener("click", () => addWorkRow());
    document.getElementById("addEquipmentBtn").addEventListener("click", () => addEquipmentRow());
    document.getElementById("addMaterialBtn").addEventListener("click", () => addMaterialRow());
    document.getElementById("addAttachmentBtn").addEventListener("click", () => addAttachmentRow());
    document.getElementById("loadPhotoPdfBtn").addEventListener("click", loadPhotoPdf);
    document.getElementById("saveDailyBtn").addEventListener("click", save);
    document.getElementById("copyYesterdayBtn").addEventListener("click", copyYesterday);
    document.getElementById("exportPdfBtn").addEventListener("click", exportPdf);

    addWorkRow();
    addEquipmentRow();
    addMaterialRow();
  }

  function updateKeys() {
    const workDate = document.getElementById("workDate").value || DailyKeys.today();
    const keys = DailyKeys.fromDate(workDate);
    document.getElementById("dateCode").value = keys.date_code;
    document.getElementById("dailyId").value = keys.daily_id;
    document.getElementById("todayLabel").textContent = workDate;
  }

  function applySiteDefault() {
    const siteInput = document.querySelector('[name="site"]');
    const site = Master.first ? Master.first("site") : "";
    if (siteInput && !siteInput.value && site && site !== "현장명 입력") siteInput.value = site;
  }

  function addWorkRow(item = {}) {
    addRow("workRows", `
      <td><input value="${safe(item.trade)}" list="tradeList" data-field="trade"></td>
      <td><input value="${safe(item.location)}" list="locationList" data-field="location"></td>
      <td><input value="${safe(item.content)}" data-field="content"></td>
      <td><input value="${safe(item.manpower)}" type="number" min="0" data-field="manpower"></td>
      <td><input value="${safe(item.progress)}" data-field="progress" placeholder="30%"></td>
      <td><button type="button" class="danger small" data-remove>삭제</button></td>
    `);
  }

  function addEquipmentRow(item = {}) {
    addRow("equipmentRows", `
      <td><input value="${safe(item.name)}" list="equipmentList" data-field="name"></td>
      <td><input value="${safe(item.qty)}" type="number" min="0" data-field="qty"></td>
      <td><input value="${safe(item.desc)}" data-field="desc"></td>
      <td><button type="button" class="danger small" data-remove>삭제</button></td>
    `);
  }

  function addMaterialRow(item = {}) {
    addRow("materialRows", `
      <td><input value="${safe(item.trade)}" list="tradeList" data-field="trade"></td>
      <td><input value="${safe(item.name)}" list="materialList" data-field="name"></td>
      <td><input value="${safe(item.spec)}" data-field="spec"></td>
      <td><input value="${safe(item.in_qty)}" type="number" min="0" data-field="in_qty"></td>
      <td><input value="${safe(item.use_qty)}" type="number" min="0" data-field="use_qty"></td>
      <td><input value="${safe(item.unit)}" list="unitList" data-field="unit"></td>
      <td><button type="button" class="danger small" data-remove>삭제</button></td>
    `);
  }

  function addAttachmentRow(item = {}) {
    addRow("attachmentRows", `
      <td><input value="${safe(item.doc_type)}" data-field="doc_type"></td>
      <td><input value="${safe(item.title)}" data-field="title"></td>
      <td><input value="${safe(item.trade)}" list="tradeList" data-field="trade"></td>
      <td><input value="${safe(item.file_name)}" data-field="file_name"></td>
      <td>
        <div class="file-cell">
          <input value="${safe(item.file_url)}" data-field="file_url" placeholder="Drive 링크 또는 업로드 후 자동 입력">
          <input type="file" class="hidden-file" data-file-input accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp">
          <button type="button" class="secondary small" data-pick-file>파일/갤러리</button>
          <button type="button" class="secondary small" data-capture-file>촬영</button>
        </div>
      </td>
      <td><button type="button" class="danger small" data-remove>삭제</button></td>
    `);
  }

  function addRow(tbodyId, cells) {
    const tbody = document.getElementById(tbodyId);
    const tr = document.createElement("tr");
    tr.innerHTML = cells;
    tr.querySelector("[data-remove]").addEventListener("click", () => tr.remove());
    bindFileInputs(tr);
    tbody.appendChild(tr);
  }

  function bindFileInputs(tr) {
    const input = tr.querySelector("[data-file-input]");
    if (!input) return;

    const pickButton = tr.querySelector("[data-pick-file]");
    const captureButton = tr.querySelector("[data-capture-file]");
    pickButton.addEventListener("click", () => {
      input.removeAttribute("capture");
      input.click();
    });
    captureButton.addEventListener("click", () => {
      input.setAttribute("capture", "environment");
      input.click();
    });
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      tr._filePayload = await fileToPayload(file);
      const nameInput = tr.querySelector('[data-field="file_name"]');
      const typeInput = tr.querySelector('[data-field="file_url"]');
      nameInput.value = file.name;
      if (!typeInput.value) typeInput.value = "저장 시 Drive 업로드";
      App.toast("첨부파일을 선택했습니다. 저장하면 업로드됩니다.");
    });
  }

  function fileToPayload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        resolve({
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          base64: dataUrl.split(",")[1]
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function loadPhotoPdf() {
    const workDate = document.getElementById("workDate").value;
    const result = await Api.listPhotoPdf(workDate);
    const list = document.getElementById("photoPdfList");
    state.photoLinks = result.items || [];

    if (!state.photoLinks.length) {
      list.className = "link-list empty";
      list.textContent = "해당 날짜의 사진대장 PDF가 없습니다.";
      return;
    }

    list.className = "link-list";
    list.innerHTML = state.photoLinks.map((item, index) => `
      <div class="pdf-item">
        <div>
          <strong>${Master.escapeHtml(item.category_name)}</strong>
          <span>${Master.escapeHtml(item.photo_date)} · 사진 ${Master.escapeHtml(item.photo_count)}장</span>
        </div>
        <div class="actions">
          <a href="${Master.escapeHtml(item.pdf_url)}" target="_blank" rel="noreferrer"><button type="button" class="secondary">PDF 열기</button></a>
          <button type="button" data-include-photo="${index}">일보 포함</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-include-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = state.photoLinks[Number(button.dataset.includePhoto)];
        item.status = "included";
        App.toast("사진대장 PDF 링크를 작업일보에 포함했습니다.");
      });
    });
  }

  function collect() {
    const form = new FormData(document.getElementById("dailyForm"));
    const workDate = form.get("work_date");
    const keys = DailyKeys.fromDate(workDate);
    const report = {
      ...keys,
      site: form.get("site"),
      company: form.get("company"),
      work_date: workDate,
      weather: form.get("weather"),
      writer: form.get("writer"),
      temp: form.get("temp"),
      note: form.get("note"),
      tomorrow: form.get("tomorrow"),
      status: "saved"
    };

    return {
      report,
      works: collectRows("workRows"),
      equipment: collectRows("equipmentRows"),
      materials: collectRows("materialRows"),
      attachments: collectRows("attachmentRows"),
      photo_links: state.photoLinks.filter((item) => item.status === "included")
    };
  }

  function collectRows(tbodyId) {
    return Array.from(document.getElementById(tbodyId).querySelectorAll("tr")).map((tr) => {
      const item = {};
      tr.querySelectorAll("[data-field]").forEach((input) => {
        item[input.dataset.field] = input.value.trim();
      });
      return item;
    }).filter((item) => Object.values(item).some(Boolean));
  }

  async function save() {
    updateKeys();
    const payload = await collectForSave();
    const result = await Api.request("save_daily", payload);
    App.toast(result.status === "ok" ? "작업일보를 저장했습니다." : "저장에 실패했습니다.");
  }

  async function collectForSave() {
    const payload = collect();
    payload.attachments = await uploadPendingAttachments(payload);
    return payload;
  }

  async function uploadPendingAttachments(payload) {
    const rows = Array.from(document.getElementById("attachmentRows").querySelectorAll("tr"));
    const attachments = payload.attachments;
    for (let index = 0; index < rows.length; index += 1) {
      const filePayload = rows[index]._filePayload;
      if (!filePayload || !attachments[index]) continue;
      const result = await Api.uploadAttachment({
        ...filePayload,
        daily_id: payload.report.daily_id,
        date_code: payload.report.date_code,
        hub_key: payload.report.hub_key,
        work_date: payload.report.work_date,
        doc_type: attachments[index].doc_type,
        title: attachments[index].title,
        trade: attachments[index].trade
      });
      if (result.status === "ok") {
        attachments[index].file_name = result.file_name || filePayload.file_name;
        attachments[index].file_type = result.file_type || filePayload.file_type;
        attachments[index].file_url = result.file_url || attachments[index].file_url;
      }
    }
    return attachments;
  }

  async function copyYesterday() {
    const workDate = document.getElementById("workDate").value;
    const result = await Api.request("copy_yesterday", { work_date: workDate });
    if (result.status === "ok" && result.item) {
      loadIntoForm(result.item);
      App.toast("어제 작업일보를 오늘 날짜로 복사했습니다.");
      return;
    }
    App.toast("복사할 어제 작업일보가 없습니다.");
  }

  async function exportPdf() {
    const payload = collect();
    renderPrintPreview(payload);
    const result = await Api.request("export_daily_pdf", payload);
    showSavedPdfLink(result);
    App.toast(result.pdf_url ? "Drive에 작업일보 PDF를 저장했습니다." : "출력폼 미리보기를 만들었습니다.");
  }

  function showSavedPdfLink(result) {
    if (!result || !result.pdf_url) return;
    const toolbar = document.querySelector("#printPreview .print-toolbar .actions");
    if (!toolbar) return;
    const link = document.createElement("a");
    link.href = result.pdf_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = '<button type="button" class="secondary">Drive PDF 열기</button>';
    toolbar.appendChild(link);
  }

  function renderPrintPreview(payload) {
    const preview = document.getElementById("printPreview");
    const { report, works, equipment, materials, attachments, photo_links } = payload;
    preview.className = "print-preview show";
    preview.innerHTML = `
      <div class="print-toolbar">
        <strong>작업일보 출력폼 미리보기</strong>
        <div class="actions">
          <button type="button" id="browserPrintBtn">브라우저 인쇄</button>
        </div>
      </div>
      <article class="print-page">
        <div class="print-title">
          <h2>작업일보</h2>
          <div>
            <div><b>일보번호</b> ${safe(report.daily_id)}</div>
            <div><b>날짜코드</b> ${safe(report.date_code)}</div>
          </div>
        </div>
        <div class="print-meta">
          ${meta("현장명", report.site)}
          ${meta("작업일", report.work_date)}
          ${meta("날씨", report.weather)}
          ${meta("업체", report.company)}
          ${meta("작성자", report.writer)}
          ${meta("기온", report.temp)}
        </div>
        ${sectionTable("공종별 작업현황", ["공종", "부위", "작업내용", "출역", "진행률"], works, ["trade", "location", "content", "manpower", "progress"])}
        ${sectionTable("장비사용현황", ["장비명", "수량", "비고"], equipment, ["name", "qty", "desc"])}
        ${sectionTable("자재현황", ["공종", "자재명", "규격", "반입", "사용", "단위"], materials, ["trade", "name", "spec", "in_qty", "use_qty", "unit"])}
        <section class="print-section">
          <h3>특이사항</h3>
          <div class="print-note">${safe(report.note)}</div>
        </section>
        <section class="print-section">
          <h3>명일 작업계획</h3>
          <div class="print-note">${safe(report.tomorrow)}</div>
        </section>
      </article>
      <article class="print-page">
        <div class="print-title">
          <h2>증빙자료 보관 현황</h2>
          <div>
            <div><b>일보번호</b> ${safe(report.daily_id)}</div>
            <div><b>Hub Key</b> ${safe(report.hub_key)}</div>
          </div>
        </div>
        ${sectionTable("1. 사진대장 보관 현황", ["구분", "일자", "사진수", "Drive 링크"], photo_links, ["category_name", "photo_date", "photo_count", "pdf_url"])}
        ${sectionTable("2. 첨부문서 보관 현황", ["구분", "문서명", "공종", "파일명", "Drive 링크"], attachments, ["doc_type", "title", "trade", "file_name", "file_url"])}
      </article>
    `;
    document.getElementById("browserPrintBtn").addEventListener("click", () => window.print());
    preview.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function meta(label, value) {
    return `<div><b>${safe(label)}</b><span>${safe(value)}</span></div>`;
  }

  function sectionTable(title, headers, rows, fields) {
    const body = rows.length ? rows.map((row) => `
      <tr>${fields.map((field) => `<td>${safe(row[field])}</td>`).join("")}</tr>
    `).join("") : `<tr><td colspan="${headers.length}">입력된 내용 없음</td></tr>`;

    return `
      <section class="print-section">
        <h3>${safe(title)}</h3>
        <table class="print-table">
          <thead><tr>${headers.map((header) => `<th>${safe(header)}</th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>
    `;
  }

  function safe(value) {
    return Master.escapeHtml(value || "");
  }

  function loadIntoForm(payload) {
    const report = payload.report || {};
    const form = document.getElementById("dailyForm");
    setFormValue(form, "work_date", report.work_date);
    setFormValue(form, "site", report.site);
    setFormValue(form, "company", report.company);
    setFormValue(form, "writer", report.writer);
    setFormValue(form, "weather", report.weather);
    setFormValue(form, "temp", report.temp);
    setFormValue(form, "note", report.note);
    setFormValue(form, "tomorrow", report.tomorrow);
    updateKeys();

    replaceRows("workRows", payload.works || [], addWorkRow);
    replaceRows("equipmentRows", payload.equipment || [], addEquipmentRow);
    replaceRows("materialRows", payload.materials || [], addMaterialRow);
    replaceRows("attachmentRows", payload.attachments || [], addAttachmentRow);
    state.photoLinks = payload.photo_links || [];
    renderIncludedPhotoLinks();
    document.getElementById("printPreview").className = "print-preview";
  }

  function setFormValue(form, name, value) {
    const input = form.elements[name];
    if (input) input.value = value || "";
  }

  function replaceRows(tbodyId, items, addFn) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";
    if (items.length) {
      items.forEach((item) => addFn(item));
    } else {
      addFn();
    }
  }

  function renderIncludedPhotoLinks() {
    const list = document.getElementById("photoPdfList");
    const included = state.photoLinks.filter((item) => item.status === "included" || item.status === "linked");
    if (!included.length) {
      list.className = "link-list empty";
      list.textContent = "작업일 기준으로 사진대장 PDF를 조회합니다.";
      return;
    }
    list.className = "link-list";
    list.innerHTML = included.map((item) => `
      <div class="pdf-item">
        <div>
          <strong>${Master.escapeHtml(item.category_name)}</strong>
          <span>${Master.escapeHtml(item.photo_date)} · 사진 ${Master.escapeHtml(item.photo_count)}장 · 포함됨</span>
        </div>
        <div class="actions">
          <a href="${Master.escapeHtml(item.pdf_url)}" target="_blank" rel="noreferrer"><button type="button" class="secondary">PDF 열기</button></a>
        </div>
      </div>
    `).join("");
  }

  return {
    init,
    collect,
    loadIntoForm
  };
})();
