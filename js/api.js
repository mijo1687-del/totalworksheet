const Api = (() => {
  const CONFIG = {
    dailyApiUrl: "",
    photoApiUrl: ""
  };

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem("fieldDailyHub.config")) || {};
      CONFIG.dailyApiUrl = saved.dailyApiUrl || "";
      CONFIG.photoApiUrl = saved.photoApiUrl || "";
    } catch (error) {
      CONFIG.dailyApiUrl = "";
      CONFIG.photoApiUrl = "";
    }
  }

  function saveConfig() {
    localStorage.setItem("fieldDailyHub.config", JSON.stringify(CONFIG));
  }

  async function request(action, payload = {}) {
    if (!CONFIG.dailyApiUrl) {
      return local(action, payload);
    }

    const response = await fetch(CONFIG.dailyApiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    return response.json();
  }

  async function listPhotoPdf(workDate) {
    if (!CONFIG.photoApiUrl) {
      return mock("list_photo_pdf", { work_date: workDate });
    }

    const url = new URL(CONFIG.photoApiUrl);
    url.searchParams.set("action", "list_pdf");
    url.searchParams.set("date", workDate);
    const response = await fetch(url.toString());
    return response.json();
  }

  async function uploadAttachment(payload) {
    if (!CONFIG.dailyApiUrl) {
      return {
        status: "ok",
        file_url: "",
        file_name: payload.file_name,
        file_type: payload.file_type,
        message: "GAS 연결 후 Drive 첨부폴더에 업로드됩니다."
      };
    }

    return request("upload_attachment", payload);
  }

  function mock(action, payload) {
    const workDate = payload.work_date || payload.workDate || DailyKeys.today();
    const keys = DailyKeys.fromDate(workDate);

    const responses = {
      get_master: {
        status: "ok",
        items: Master.defaultItems()
      },
      save_master: { status: "ok" },
      save_daily: { status: "ok", daily_id: payload.report?.daily_id || keys.daily_id },
      copy_yesterday: { status: "ok", item: null },
      list_daily: { status: "ok", items: [] },
      search_summary: {
        status: "ok",
        items: [],
        message: "GAS URL 연결 후 스프레드시트 DB 기준으로 조회됩니다."
      },
      export_daily_pdf: {
        status: "ok",
        pdf_url: "",
        message: "GAS PDF 출력 구현 후 Drive 링크가 반환됩니다."
      },
      list_photo_pdf: {
        status: "ok",
        date_code: keys.date_code,
        hub_key: keys.hub_key,
        items: [
          {
            photo_doc_id: `PH-${keys.date_code}-001`,
            category: "const",
            category_name: "현장시공사진",
            photo_date: workDate,
            photo_count: 12,
            pdf_url: "https://drive.google.com/"
          }
        ]
      }
    };

    return Promise.resolve(responses[action] || { status: "ok" });
  }

  function local(action, payload) {
    const workDate = payload.work_date || payload.workDate || payload.report?.work_date || DailyKeys.today();
    const keys = DailyKeys.fromDate(workDate);

    if (action === "get_master") {
      return Promise.resolve({
        status: "ok",
        items: read("masterItems", Master.defaultItems())
      });
    }

    if (action === "save_master") {
      write("masterItems", payload.items || []);
      return Promise.resolve({ status: "ok", count: (payload.items || []).length });
    }

    if (action === "save_daily") {
      const reports = read("dailyReports", []);
      const item = {
        ...payload,
        report: {
          ...payload.report,
          updated_at: new Date().toISOString()
        }
      };
      const index = reports.findIndex((report) => report.report.daily_id === item.report.daily_id);
      if (index >= 0) {
        reports[index] = item;
      } else {
        reports.push(item);
      }
      write("dailyReports", reports);
      return Promise.resolve({ status: "ok", daily_id: item.report.daily_id });
    }

    if (action === "get_daily") {
      const reports = read("dailyReports", []);
      const item = reports.find((report) => report.report.daily_id === payload.daily_id);
      return Promise.resolve({ status: item ? "ok" : "not_found", item });
    }

    if (action === "delete_daily") {
      const reports = read("dailyReports", []).filter((report) => report.report.daily_id !== payload.daily_id);
      write("dailyReports", reports);
      return Promise.resolve({ status: "ok" });
    }

    if (action === "copy_yesterday") {
      const yesterday = new Date(workDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().slice(0, 10);
      const source = read("dailyReports", []).find((report) => report.report.work_date === yesterdayDate);
      if (!source) return Promise.resolve({ status: "not_found", item: null });
      const copied = JSON.parse(JSON.stringify(source));
      copied.report = {
        ...copied.report,
        ...keys,
        work_date: workDate,
        status: "draft",
        updated_at: new Date().toISOString()
      };
      return Promise.resolve({ status: "ok", item: copied });
    }

    if (action === "list_daily") {
      const items = read("dailyReports", [])
        .map((item) => item.report)
        .sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)));
      return Promise.resolve({ status: "ok", items });
    }

    if (action === "search_summary") {
      return Promise.resolve(buildSummary(payload.filters || {}));
    }

    if (action === "export_daily_pdf") {
      return Promise.resolve({
        status: "ok",
        pdf_url: "",
        message: "브라우저 인쇄로 PDF 저장이 가능합니다."
      });
    }

    return mock(action, payload);
  }

  function buildSummary(filters) {
    const reports = read("dailyReports", []).filter((item) => inPeriod(item.report.work_date, filters.period));
    const works = reports.flatMap((item) => item.works || []).filter((item) => !filters.trade || item.trade === filters.trade);
    const equipment = reports.flatMap((item) => item.equipment || []).filter((item) => !filters.equipment || item.name === filters.equipment);
    const materials = reports.flatMap((item) => item.materials || []).filter((item) => !filters.material || item.name === filters.material);

    return {
      status: "ok",
      items: [
        { title: "공종별 출역인원", rows: sumBy(works, "trade", "manpower", "명") },
        { title: "장비 사용누계", rows: sumBy(equipment, "name", "qty", "대") },
        { title: "자재 반입량", rows: sumBy(materials, "name", "in_qty", "") },
        { title: "자재 사용량", rows: sumBy(materials, "name", "use_qty", "") }
      ]
    };
  }

  function sumBy(items, labelKey, valueKey, unit) {
    const map = items.reduce((acc, item) => {
      const label = item[labelKey] || "미분류";
      acc[label] = (acc[label] || 0) + Number(item[valueKey] || 0);
      return acc;
    }, {});
    return Object.entries(map).map(([label, value]) => ({ label, value: `${value}${unit}` }));
  }

  function inPeriod(workDate, period) {
    if (!workDate || !period || period === "all") return true;
    const date = new Date(workDate);
    const today = new Date(DailyKeys.today());
    if (period === "today") return workDate === DailyKeys.today();
    if (period === "month") return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
    if (period === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return date >= start && date <= end;
    }
    return true;
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(`fieldDailyHub.${key}`)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(`fieldDailyHub.${key}`, JSON.stringify(value));
  }

  return {
    CONFIG,
    loadConfig,
    saveConfig,
    request,
    listPhotoPdf,
    uploadAttachment
  };
})();
