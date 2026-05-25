const SHEETS = {
  PHOTO_DB: "Photo_DB",
  PDF_LOG: "PDF_Log"
};

const HEADERS = {
  Photo_DB: [
    "photo_id", "date_code", "photo_date", "category", "category_name",
    "trade", "location", "content", "photographer", "memo", "file_name",
    "file_url", "thumb_url", "created_at"
  ],
  PDF_Log: [
    "pdf_id", "date_code", "photo_date", "category", "category_name",
    "photo_count", "pdf_file_name", "pdf_url", "created_at"
  ]
};

const CATEGORY_MAP = {
  CONST: { name: "현장시공사진", folder: "시공" },
  SAFE: { name: "안전사진", folder: "안전" },
  TBM: { name: "TBM", folder: "TBM" },
  QUAL: { name: "품질사진", folder: "품질" },
  ENV: { name: "환경사진", folder: "환경" },
  ETC: { name: "기타", folder: "기타" }
};

function doGet(e) {
  e = e || { parameter: {} };
  const action = e.parameter.action;
  if (action === "setup") return json(setupSheets_());
  if (action === "list_pdf") return json(listPdf_(e.parameter.date));
  return json({ status: "error", message: "Unknown GET action" });
}

function setupSheets() {
  return setupSheets_();
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const action = payload.action;
  if (action === "setup") return json(setupSheets_());
  if (action === "save_photos") return json(savePhotos_(payload.photos || []));
  if (action === "search_photos") return json(searchPhotos_(payload));
  if (action === "create_pdf") return json(createPdf_(payload));
  if (action === "list_pdf") return json(listPdf_(payload.date));
  if (action === "summary") return json(summary_());
  return json({ status: "error", message: "Unknown POST action" });
}

function setupSheets_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS[sheetName]);
  });
  return { status: "ok" };
}

function savePhotos_(photos) {
  setupSheets_();
  const existing = readSheet_(SHEETS.PHOTO_DB);
  const now = now_();
  const saved = photos.map((photo, index) => {
    const dateCode = photo.date_code || String(photo.photo_date).replace(/-/g, "");
    const category = CATEGORY_MAP[photo.category] || CATEGORY_MAP.CONST;
    const photoId = `PH-${dateCode}-${pad_(existing.length + index + 1)}`;
    const folder = getPhotoFolder_(photo.photo_date, photo.category);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(photo.base64),
      photo.file_type || "image/jpeg",
      photo.file_name || `${photoId}.jpg`
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {
      photo_id: photoId,
      date_code: dateCode,
      photo_date: photo.photo_date,
      category: photo.category,
      category_name: category.name,
      trade: photo.trade || "",
      location: photo.location || "",
      content: photo.content || "",
      photographer: photo.photographer || "",
      memo: photo.memo || "",
      file_name: file.getName(),
      file_url: file.getUrl(),
      thumb_url: file.getUrl(),
      created_at: now
    };
  });
  appendObjects_(SHEETS.PHOTO_DB, saved);
  return { status: "ok", items: saved };
}

function searchPhotos_(filters) {
  setupSheets_();
  const keyword = String(filters.keyword || "");
  const items = readSheet_(SHEETS.PHOTO_DB).filter((photo) => {
    if (filters.start_date && photo.photo_date < filters.start_date) return false;
    if (filters.end_date && photo.photo_date > filters.end_date) return false;
    if (filters.category && photo.category !== filters.category) return false;
    if (keyword) {
      const text = [photo.trade, photo.location, photo.content, photo.photographer, photo.memo].join(" ");
      if (text.indexOf(keyword) < 0) return false;
    }
    return true;
  });
  return { status: "ok", items: items };
}

function createPdf_(payload) {
  setupSheets_();
  const photoDate = payload.photo_date;
  const categoryCode = payload.category || "CONST";
  const category = CATEGORY_MAP[categoryCode] || CATEGORY_MAP.CONST;
  const dateCode = payload.date_code || String(photoDate).replace(/-/g, "");
  const photos = readSheet_(SHEETS.PHOTO_DB).filter((photo) => {
    return photo.photo_date === photoDate && photo.category === categoryCode;
  });
  const pdfId = `PDF-${dateCode}-${categoryCode}`;
  const pdfName = `${photoDate}_${category.name}_001.pdf`;
  const html = buildPdfHtml_(payload, category, photos);
  const blob = Utilities.newBlob(html, "text/html", `${pdfName}.html`).getAs(MimeType.PDF).setName(pdfName);
  const folder = getOrCreateFolder_(getRootFolder_(), "사진대장_PDF");
  const dateFolder = getOrCreateFolder_(folder, photoDate);
  const file = dateFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const item = {
    pdf_id: pdfId,
    date_code: dateCode,
    photo_date: photoDate,
    category: categoryCode,
    category_name: category.name,
    photo_count: photos.length,
    pdf_file_name: pdfName,
    pdf_url: file.getUrl(),
    created_at: now_()
  };
  upsertByKey_(SHEETS.PDF_LOG, "pdf_id", item);
  return { status: "ok", item: item };
}

function listPdf_(date) {
  setupSheets_();
  const items = readSheet_(SHEETS.PDF_LOG)
    .filter((item) => !date || item.photo_date === date)
    .map((item) => ({
      pdf_id: item.pdf_id,
      date_code: item.date_code,
      category: item.category,
      category_name: item.category_name,
      photo_date: item.photo_date,
      photo_count: item.photo_count,
      pdf_file_name: item.pdf_file_name,
      pdf_url: item.pdf_url
    }));
  return { status: "ok", items: items };
}

function summary_() {
  setupSheets_();
  const photos = readSheet_(SHEETS.PHOTO_DB);
  return {
    status: "ok",
    items: [
      { title: "카테고리별 사진수", rows: countBy_(photos, "category_name") },
      { title: "공종별 사진수", rows: countBy_(photos, "trade") },
      { title: "날짜별 사진수", rows: countBy_(photos, "photo_date") }
    ]
  };
}

function buildPdfHtml_(payload, category, photos) {
  const mode = resolveLayoutMode_(payload.layout_mode, photos.length);
  const perPage = mode === "one" ? 1 : 2;
  const chunks = [];
  for (let i = 0; i < photos.length; i += perPage) chunks.push(photos.slice(i, i + perPage));
  const pages = chunks.length ? chunks : [[]];
  const isConst = payload.category === "CONST";
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    .page { min-height: 265mm; page-break-after: always; display: flex; flex-direction: column; }
    h1 { text-align: center; font-size: 25px; margin: 0 0 10px; letter-spacing: 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #111827; padding: 6px; font-size: 12px; vertical-align: middle; }
    th { background: #eef2f7; }
    .meta td:nth-child(odd) { width: 16%; background: #eef2f7; font-weight: bold; }
    .photos { flex: 1; display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 12px; align-content: center; }
    .photos.two { grid-template-rows: 1fr 1fr; }
    .photo { border: 1px solid #111827; padding: 8px; display: flex; flex-direction: column; justify-content: center; }
    .photo.one { min-height: 214mm; }
    .photo.two { min-height: 104mm; }
    .photo img { width: 100%; object-fit: contain; display: block; margin: 0 auto; background: #fff; }
    .photo.one img { max-height: 174mm; }
    .photo.two img { max-height: 74mm; }
    .caption { margin-top: 6px; font-size: 12px; line-height: 1.35; text-align: center; }
    .caption span { display: inline-block; margin: 0 6px; }
  </style>
</head>
<body>
  ${pages.map((page) => `
    <section class="page">
      <h1>현 장 사 진 대 장</h1>
      <table class="meta">
        <tr><td>공사명</td><td>${esc_(payload.site_name)}</td><td>작업일</td><td>${esc_(payload.photo_date)}</td></tr>
        <tr><td>구분</td><td>${esc_(category.name)}</td><td>작성자</td><td>${esc_(payload.writer)}</td></tr>
      </table>
      <div class="photos ${mode}">
        ${page.map((photo) => `
          <div class="photo ${mode}">
            <img src="${toDriveImageUrl_(photo.file_url)}">
            <div class="caption">
              ${isConst ? `<span><b>공종</b> ${esc_(photo.trade)}</span><span><b>위치</b> ${esc_(photo.location)}</span>` : ""}
              <span><b>내용</b> ${esc_(photo.content)}</span>
              <span><b>촬영시간</b> ${esc_(photo.created_at)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `).join("")}
</body>
</html>`;
}

function resolveLayoutMode_(requestedMode, photoCount) {
  if (requestedMode === "one") return "one";
  if (requestedMode === "two") return "two";
  return photoCount <= 1 ? "one" : "two";
}

function toDriveImageUrl_(url) {
  const match = String(url || "").match(/\/d\/([^/]+)/);
  if (!match) return esc_(url);
  return `https://drive.google.com/uc?export=view&id=${match[1]}`;
}

function getPhotoFolder_(photoDate, categoryCode) {
  const date = new Date(photoDate);
  const year = String(date.getFullYear());
  const month = `${year}-${pad2_(date.getMonth() + 1)}`;
  const category = CATEGORY_MAP[categoryCode] || CATEGORY_MAP.CONST;
  const root = getRootFolder_();
  const yearFolder = getOrCreateFolder_(root, year);
  const monthFolder = getOrCreateFolder_(yearFolder, month);
  const dateFolder = getOrCreateFolder_(monthFolder, photoDate);
  return getOrCreateFolder_(dateFolder, category.folder);
}

function getRootFolder_() {
  return getOrCreateFolder_(DriveApp.getRootFolder(), "현장사진관리_DB");
}

function getOrCreateFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function readSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map((row) => objectFromRow_(headers, row));
}

function appendObjects_(sheetName, objects) {
  if (!objects.length) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.getRange(sheet.getLastRow() + 1, 1, objects.length, headers.length)
    .setValues(objects.map((item) => rowFromObject_(headers, item)));
}

function upsertByKey_(sheetName, key, object) {
  const items = readSheet_(sheetName);
  const index = items.findIndex((item) => item[key] === object[key]);
  if (index >= 0) items[index] = object;
  else items.push(object);
  replaceSheet_(sheetName, items);
}

function replaceSheet_(sheetName, objects) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.clearContents();
  sheet.appendRow(headers);
  if (!objects.length) return;
  sheet.getRange(2, 1, objects.length, headers.length).setValues(objects.map((item) => rowFromObject_(headers, item)));
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

function countBy_(items, key) {
  const map = {};
  items.forEach((item) => {
    const label = item[key] || "미분류";
    map[label] = (map[label] || 0) + 1;
  });
  return Object.keys(map).map((label) => ({ label: label, value: map[label] }));
}

function pad_(value) {
  return String(value).padStart(3, "0");
}

function pad2_(value) {
  return String(value).padStart(2, "0");
}

function now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function esc_(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
