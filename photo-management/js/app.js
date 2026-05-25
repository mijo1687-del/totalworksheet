const App = (() => {
  function init() {
    Api.loadConfig();
    bindNavigation();
    bindSettings();
    renderSettings();
    renderMasters();
    Photo.init();
    Search.init();
    Pdf.init();
  }

  function bindNavigation() {
    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });
  }

  function showView(viewId) {
    document.querySelectorAll(".tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
  }

  function bindSettings() {
    document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  }

  function renderSettings() {
    document.getElementById("apiUrl").value = Api.CONFIG.apiUrl;
    document.getElementById("siteName").value = Api.CONFIG.siteName;
    updateStorageStatus();
  }

  function saveSettings() {
    Api.CONFIG.apiUrl = document.getElementById("apiUrl").value.trim();
    Api.CONFIG.siteName = document.getElementById("siteName").value.trim();
    Api.saveConfig();
    saveMasters();
    updateStorageStatus();
    toast("설정을 저장했습니다.");
  }

  function updateStorageStatus() {
    document.getElementById("storageStatus").textContent = Api.CONFIG.apiUrl
      ? "현재 저장 방식: Google Spreadsheet DB + Drive"
      : "현재 저장 방식: 브라우저 임시 저장";
  }

  function renderMasters() {
    const masters = readMasters();
    document.getElementById("masterTrade").value = masters.trade.join("\n");
    document.getElementById("masterLocation").value = masters.location.join("\n");
    renderDatalist("tradeList", masters.trade);
    renderDatalist("locationList", masters.location);
  }

  function saveMasters() {
    const masters = {
      trade: lines("masterTrade"),
      location: lines("masterLocation")
    };
    localStorage.setItem("photoManagement.masters", JSON.stringify(masters));
    renderMasters();
  }

  function readMasters() {
    try {
      return JSON.parse(localStorage.getItem("photoManagement.masters")) || defaultMasters();
    } catch (error) {
      return defaultMasters();
    }
  }

  function defaultMasters() {
    return {
      trade: ["철근공사", "거푸집공사", "콘크리트공사", "가설공사"],
      location: ["1층 A구간", "1층 B구간", "2층", "지하 1층"]
    };
  }

  function lines(id) {
    return document.getElementById(id).value.split("\n").map((line) => line.trim()).filter(Boolean);
  }

  function renderDatalist(id, values) {
    document.getElementById(id).innerHTML = values.map((value) => `<option value="${escape(value)}"></option>`).join("");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(() => el.classList.remove("show"), 2400);
  }

  function escape(value) {
    return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  return {
    init,
    today,
    toast,
    escape
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
