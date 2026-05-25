const App = (() => {
  function init() {
    bindNavigation();
    bindMaster();
    Settings.init();
    Daily.init();
    Summary.init();
    ProgressReport.init();
    Master.load();
  }

  function bindNavigation() {
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => {
        showView(button.dataset.view);
      });
    });
  }

  function showView(viewId) {
    document.querySelectorAll(".nav-button").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewId);
    });
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
  }

  function bindMaster() {
    document.getElementById("saveMasterBtn").addEventListener("click", Master.save);
    document.getElementById("restoreMasterBtn").addEventListener("click", Master.restore);
  }

  function toast(message) {
    const toastEl = document.getElementById("toast");
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.clearTimeout(toastEl._timer);
    toastEl._timer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  return {
    init,
    toast,
    showView
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
