const Api = (() => {
  const CONFIG = {
    apiUrl: "",
    siteName: ""
  };

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem("photoManagement.config")) || {};
      CONFIG.apiUrl = saved.apiUrl || "";
      CONFIG.siteName = saved.siteName || "";
    } catch (error) {
      CONFIG.apiUrl = "";
      CONFIG.siteName = "";
    }
  }

  function saveConfig() {
    localStorage.setItem("photoManagement.config", JSON.stringify(CONFIG));
  }

  async function request(action, payload = {}) {
    if (!CONFIG.apiUrl) return local(action, payload);
    const response = await fetch(CONFIG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    return response.json();
  }

  async function get(action, params = {}) {
    if (!CONFIG.apiUrl) return local(action, params);
    const url = new URL(CONFIG.apiUrl);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url.toString());
    return response.json();
  }

  function local(action, payload) {
    if (action === "save_photos") {
      const photos = read("photos", []);
      const saved = payload.photos.map((photo, index) => ({
        ...photo,
        photo_id: nextPhotoId(photo.photo_date, photos.length + index + 1),
        file_url: photo.data_url,
        thumb_url: photo.data_url,
        created_at: new Date().toISOString()
      }));
      write("photos", photos.concat(saved));
      return Promise.resolve({ status: "ok", items: saved });
    }

    if (action === "search_photos") {
      return Promise.resolve({ status: "ok", items: filterPhotos(read("photos", []), payload) });
    }

    if (action === "create_pdf") {
      const photos = filterPhotos(read("photos", []), {
        start_date: payload.photo_date,
        end_date: payload.photo_date,
        category: payload.category
      });
      const category = Categories.find(payload.category);
      const pdf = {
        pdf_id: `PDF-${dateCode(payload.photo_date)}-${payload.category}`,
        date_code: dateCode(payload.photo_date),
        photo_date: payload.photo_date,
        category: payload.category,
        category_name: category.name,
        photo_count: photos.length,
        layout_mode: payload.layout_mode || "auto",
        pdf_file_name: `${payload.photo_date}_${category.name}_001.pdf`,
        pdf_url: "",
        created_at: new Date().toISOString()
      };
      const logs = read("pdfLogs", []).filter((item) => item.pdf_id !== pdf.pdf_id);
      logs.push(pdf);
      write("pdfLogs", logs);
      return Promise.resolve({ status: "ok", item: pdf, message: "GAS 연결 후 Drive PDF가 생성됩니다." });
    }

    if (action === "list_pdf") {
      const items = read("pdfLogs", []).filter((item) => !payload.date || item.photo_date === payload.date);
      return Promise.resolve({ status: "ok", items });
    }

    if (action === "summary") {
      const photos = read("photos", []);
      return Promise.resolve({
        status: "ok",
        items: [
          { title: "카테고리별 사진수", rows: countBy(photos, "category_name") },
          { title: "공종별 사진수", rows: countBy(photos, "trade") },
          { title: "날짜별 사진수", rows: countBy(photos, "photo_date") }
        ]
      });
    }

    return Promise.resolve({ status: "ok" });
  }

  function filterPhotos(photos, filters) {
    const keyword = String(filters.keyword || "").trim();
    return photos.filter((photo) => {
      if (filters.start_date && photo.photo_date < filters.start_date) return false;
      if (filters.end_date && photo.photo_date > filters.end_date) return false;
      if (filters.category && photo.category !== filters.category) return false;
      if (keyword) {
        const text = [photo.trade, photo.location, photo.content, photo.photographer, photo.memo].join(" ");
        if (!text.includes(keyword)) return false;
      }
      return true;
    });
  }

  function countBy(items, key) {
    const map = items.reduce((acc, item) => {
      const label = item[key] || "미분류";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }

  function nextPhotoId(photoDate, index) {
    return `PH-${dateCode(photoDate)}-${String(index).padStart(3, "0")}`;
  }

  function dateCode(photoDate) {
    return String(photoDate).replaceAll("-", "");
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(`photoManagement.${key}`)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(`photoManagement.${key}`, JSON.stringify(value));
  }

  return {
    CONFIG,
    loadConfig,
    saveConfig,
    request,
    get,
    dateCode
  };
})();
