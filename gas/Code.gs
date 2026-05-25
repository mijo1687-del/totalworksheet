const SHEETS = {
  DAILY_REPORT: "Daily_Report",
  DAILY_WORK: "Daily_Work",
  DAILY_EQUIPMENT: "Daily_Equipment",
  DAILY_MATERIAL: "Daily_Material",
  DAILY_ATTACHMENT: "Daily_Attachment",
  DAILY_PHOTO_LINK: "Daily_Photo_Link",
  MASTER_CODE: "Master_Code"
};

const HEADERS = {
  Daily_Report: [
    "daily_id", "date_code", "hub_key", "site", "company", "work_date",
    "weather", "writer", "temp", "note", "tomorrow", "pdf_url", "status",
    "created_at", "updated_at"
  ],
  Daily_Work: [
    "work_id", "daily_id", "date_code", "hub_key", "work_date", "trade",
    "location", "content", "manpower", "progress", "created_at"
  ],
  Daily_Equipment: [
    "equip_id", "daily_id", "date_code", "hub_key", "work_date", "name",
    "qty", "desc", "created_at"
  ],
  Daily_Material: [
    "material_id", "daily_id", "date_code", "hub_key", "work_date", "trade",
    "name", "spec", "in_qty", "use_qty", "unit", "created_at"
  ],
  Daily_Attachment: [
    "attachment_id", "daily_id", "date_code", "hub_key", "attach_date",
    "doc_type", "title", "trade", "file_name", "file_type", "file_url",
    "status", "created_at"
  ],
  Daily_Photo_Link: [
    "photo_link_id", "daily_id", "date_code", "hub_key", "photo_doc_id",
    "category", "category_name", "photo_date", "photo_count", "pdf_url",
    "source", "status", "created_at"
  ],
  Master_Code: [
    "code_id", "code_type", "code_name", "alias", "sort_order", "active",
    "created_at", "updated_at"
  ]
};

function doGet(e) {
  const action = e.parameter.action;
  if (action === "setup") return json(setupSheets_());
  if (action === "get_master") return json(getMaster_());
  if (action === "list_daily") return json(listDaily_());
  if (action === "get_daily") return json(getDaily_(e.parameter.daily_id));
  return json({ status: "error", message: "Unknown GET action" });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const action = payload.action;

  if (action === "get_master") return json(getMaster_());
  if (action === "save_master") return json(saveMaster_(payload.items || []));
  if (action === "save_daily") return json(saveDaily_(payload));
  if (action === "get_daily") return json(getDaily_(payload.daily_id));
  if (action === "list_daily") return json(listDaily_());
  if (action === "delete_daily") return json(deleteDaily_(payload.daily_id));
  if (action === "copy_yesterday") return json(copyYesterday_(payload.work_date));
  if (action === "link_photo_pdf") return json(linkPhotoPdf_(payload));
  if (action === "upload_attachment") return json(uploadAttachment_(payload));
  if (action === "search_summary") return json(searchSummary_(payload.filters || {}));
  if (action === "export_daily_pdf") return json(exportDailyPdf_(payload));

  return json({ status: "error", message: "Unknown POST action" });
}

function setupSheets_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
    }
  });
  return { status: "ok", message: "Sheets are ready." };
}

function getMaster_() {
  setupSheets_();
  const items = readSheet_(SHEETS.MASTER_CODE);
  return { status: "ok", items };
}

function saveMaster_(items) {
  setupSheets_();
  const now = now_();
  const rows = items.map((item, index) => ({
    code_id: item.code_id || `${String(item.code_type).toUpperCase()}-${pad_(index + 1)}`,
    code_type: item.code_type,
    code_name: item.code_name,
    alias: item.alias || "",
    sort_order: item.sort_order || index + 1,
    active: item.active || "Y",
    created_at: item.created_at || now,
    updated_at: now
  }));
  replaceSheet_(SHEETS.MASTER_CODE, rows);
  return { status: "ok", count: rows.length };
}

function saveDaily_(payload) {
  setupSheets_();
  const report = payload.report;
  const now = now_();
  const keys = buildKeys_(report.work_date);
  const base = {
    daily_id: report.daily_id || keys.daily_id,
    date_code: report.date_code || keys.date_code,
    hub_key: report.hub_key || keys.hub_key,
    work_date: report.work_date
  };

  upsertByKey_(SHEETS.DAILY_REPORT, "daily_id", {
    ...base,
    site: report.site || "",
    company: report.company || "",
    weather: report.weather || "",
    writer: report.writer || "",
    temp: report.temp || "",
    note: report.note || "",
    tomorrow: report.tomorrow || "",
    pdf_url: report.pdf_url || "",
    status: report.status || "saved",
    created_at: report.created_at || now,
    updated_at: now
  });

  replaceChildren_(SHEETS.DAILY_WORK, "daily_id", base.daily_id, payload.works || [], (item, index) => ({
    work_id: `WK-${base.date_code}-${pad_(index + 1)}`,
    ...base,
    trade: item.trade || "",
    location: item.location || "",
    content: item.content || "",
    manpower: item.manpower || "",
    progress: item.progress || "",
    created_at: now
  }));

  replaceChildren_(SHEETS.DAILY_EQUIPMENT, "daily_id", base.daily_id, payload.equipment || [], (item, index) => ({
    equip_id: `EQ-${base.date_code}-${pad_(index + 1)}`,
    ...base,
    name: item.name || "",
    qty: item.qty || "",
    desc: item.desc || "",
    created_at: now
  }));

  replaceChildren_(SHEETS.DAILY_MATERIAL, "daily_id", base.daily_id, payload.materials || [], (item, index) => ({
    material_id: `MT-${base.date_code}-${pad_(index + 1)}`,
    ...base,
    trade: item.trade || "",
    name: item.name || "",
    spec: item.spec || "",
    in_qty: item.in_qty || "",
    use_qty: item.use_qty || "",
    unit: item.unit || "",
    created_at: now
  }));

  replaceChildren_(SHEETS.DAILY_ATTACHMENT, "daily_id", base.daily_id, payload.attachments || [], (item, index) => ({
    attachment_id: `AT-${base.date_code}-${pad_(index + 1)}`,
    ...base,
    attach_date: base.work_date,
    doc_type: item.doc_type || "",
    title: item.title || "",
    trade: item.trade || "",
    file_name: item.file_name || "",
    file_type: item.file_type || "",
    file_url: item.file_url || "",
    status: "linked",
    created_at: now
  }));

  replaceChildren_(SHEETS.DAILY_PHOTO_LINK, "daily_id", base.daily_id, payload.photo_links || [], (item, index) => ({
    photo_link_id: `PL-${base.date_code}-${pad_(index + 1)}`,
    ...base,
    photo_doc_id: item.photo_doc_id || "",
    category: item.category || "",
    category_name: item.category_name || "",
    photo_date: item.photo_date || base.work_date,
    photo_count: item.photo_count || "",
    pdf_url: item.pdf_url || "",
    source: "photo_app",
    status: "linked",
    created_at: now
  }));

  return { status: "ok", daily_id: base.daily_id };
}

function listDaily_() {
  setupSheets_();
  const items = readSheet_(SHEETS.DAILY_REPORT);
  return { status: "ok", items };
}

function getDaily_(dailyId) {
  setupSheets_();
  const report = readSheet_(SHEETS.DAILY_REPORT).find((item) => item.daily_id === dailyId);
  if (!report) return { status: "not_found", item: null };
  return {
    status: "ok",
    item: {
      report: report,
      works: readSheet_(SHEETS.DAILY_WORK).filter((item) => item.daily_id === dailyId),
      equipment: readSheet_(SHEETS.DAILY_EQUIPMENT).filter((item) => item.daily_id === dailyId),
      materials: readSheet_(SHEETS.DAILY_MATERIAL).filter((item) => item.daily_id === dailyId),
      attachments: readSheet_(SHEETS.DAILY_ATTACHMENT).filter((item) => item.daily_id === dailyId),
      photo_links: readSheet_(SHEETS.DAILY_PHOTO_LINK).filter((item) => item.daily_id === dailyId)
    }
  };
}

function deleteDaily_(dailyId) {
  setupSheets_();
  [
    SHEETS.DAILY_REPORT,
    SHEETS.DAILY_WORK,
    SHEETS.DAILY_EQUIPMENT,
    SHEETS.DAILY_MATERIAL,
    SHEETS.DAILY_ATTACHMENT,
    SHEETS.DAILY_PHOTO_LINK
  ].forEach((sheetName) => {
    const items = readSheet_(sheetName).filter((item) => item.daily_id !== dailyId);
    replaceSheet_(sheetName, items);
  });
  return { status: "ok" };
}

function copyYesterday_(workDate) {
  setupSheets_();
  const date = new Date(workDate);
  date.setDate(date.getDate() - 1);
  const yesterday = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const sourceReport = readSheet_(SHEETS.DAILY_REPORT).find((item) => item.work_date === yesterday);
  if (!sourceReport) return { status: "not_found", item: null };
  const source = getDaily_(sourceReport.daily_id).item;
  const keys = buildKeys_(workDate);
  source.report = {
    ...source.report,
    ...keys,
    work_date: workDate,
    status: "draft",
    updated_at: now_()
  };
  return { status: "ok", item: source };
}

function linkPhotoPdf_(payload) {
  const now = now_();
  const item = payload.item || {};
  const keys = buildKeys_(payload.work_date || item.photo_date);
  appendObject_(SHEETS.DAILY_PHOTO_LINK, {
    photo_link_id: `PL-${keys.date_code}-${pad_(new Date().getSeconds())}`,
    daily_id: payload.daily_id || keys.daily_id,
    date_code: keys.date_code,
    hub_key: keys.hub_key,
    photo_doc_id: item.photo_doc_id || "",
    category: item.category || "",
    category_name: item.category_name || "",
    photo_date: item.photo_date || payload.work_date,
    photo_count: item.photo_count || "",
    pdf_url: item.pdf_url || "",
    source: "photo_app",
    status: "linked",
    created_at: now
  });
  return { status: "ok" };
}

function uploadAttachment_(payload) {
  const rootFolder = getOrCreateFolder_(DriveApp.getRootFolder(), "현장작업일보_첨부문서");
  const dateFolder = getOrCreateFolder_(rootFolder, payload.date_code || String(payload.work_date).replace(/-/g, ""));
  const bytes = Utilities.base64Decode(payload.base64);
  const blob = Utilities.newBlob(bytes, payload.file_type || "application/octet-stream", payload.file_name);
  const file = dateFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    status: "ok",
    file_name: file.getName(),
    file_type: payload.file_type || "",
    file_url: file.getUrl(),
    folder_name: dateFolder.getName()
  };
}

function getOrCreateFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function searchSummary_(filters) {
  setupSheets_();
  const works = readSheet_(SHEETS.DAILY_WORK).filter((item) => inPeriod_(item.work_date, filters.period));
  const equipment = readSheet_(SHEETS.DAILY_EQUIPMENT).filter((item) => inPeriod_(item.work_date, filters.period));
  const materials = readSheet_(SHEETS.DAILY_MATERIAL).filter((item) => inPeriod_(item.work_date, filters.period));
  const filteredWorks = filters.trade ? works.filter((item) => item.trade === filters.trade) : works;
  const filteredEquipment = filters.equipment ? equipment.filter((item) => item.name === filters.equipment) : equipment;
  const filteredMaterials = filters.material ? materials.filter((item) => item.name === filters.material) : materials;
  return {
    status: "ok",
    filters,
    items: [
      { title: "공종별 출역인원", rows: sumBy_(filteredWorks, "trade", "manpower", "명") },
      { title: "장비 사용누계", rows: sumBy_(filteredEquipment, "name", "qty", "대") },
      { title: "자재 반입량", rows: sumBy_(filteredMaterials, "name", "in_qty", "") },
      { title: "자재 사용량", rows: sumBy_(filteredMaterials, "name", "use_qty", "") }
    ]
  };
}

function sumBy_(items, labelKey, valueKey, unit) {
  const map = {};
  items.forEach((item) => {
    const label = item[labelKey] || "미분류";
    map[label] = (map[label] || 0) + Number(item[valueKey] || 0);
  });
  return Object.keys(map).map((label) => ({ label: label, value: map[label] + unit }));
}

function inPeriod_(workDate, period) {
  if (!period || period === "all" || period === "custom") return true;
  const date = new Date(workDate);
  const today = new Date();
  if (period === "today") {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd") === Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  if (period === "month") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }
  if (period === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return date >= start && date <= end;
  }
  return true;
}

function exportDailyPdf_(payload) {
  return {
    status: "ok",
    pdf_url: "",
    message: "PDF export placeholder",
    daily_id: payload.report && payload.report.daily_id
  };
}

function readSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map((row) => objectFromRow_(headers, row));
}

function replaceSheet_(sheetName, objects) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.clearContents();
  sheet.appendRow(headers);
  if (!objects.length) return;
  sheet.getRange(2, 1, objects.length, headers.length).setValues(objects.map((item) => rowFromObject_(headers, item)));
}

function replaceChildren_(sheetName, key, value, items, mapper) {
  const existing = readSheet_(sheetName).filter((item) => item[key] !== value);
  const mapped = items.map(mapper);
  replaceSheet_(sheetName, existing.concat(mapped));
}

function upsertByKey_(sheetName, key, object) {
  const items = readSheet_(sheetName);
  const index = items.findIndex((item) => item[key] === object[key]);
  if (index >= 0) {
    items[index] = { ...items[index], ...object };
  } else {
    items.push(object);
  }
  replaceSheet_(sheetName, items);
}

function appendObject_(sheetName, object) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.appendRow(rowFromObject_(headers, object));
}

function objectFromRow_(headers, row) {
  return headers.reduce((acc, header, index) => {
    acc[header] = row[index];
    return acc;
  }, {});
}

function rowFromObject_(headers, object) {
  return headers.map((header) => object[header] === undefined ? "" : object[header]);
}

function buildKeys_(workDate) {
  const dateCode = String(workDate).replace(/-/g, "");
  return {
    date_code: dateCode,
    hub_key: `DAY-${dateCode}`,
    daily_id: `DR-${dateCode}-001`
  };
}

function pad_(value) {
  return String(value).padStart(3, "0");
}

function now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
