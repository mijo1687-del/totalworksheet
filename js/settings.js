const Settings = (() => {
  const storagePrefix = "fieldDailyHub.";

  function init() {
    Api.loadConfig();
    render();
    document.getElementById("saveSettingsBtn").addEventListener("click", save);
    document.getElementById("exportBackupBtn").addEventListener("click", exportBackup);
    document.getElementById("importBackupBtn").addEventListener("click", () => {
      document.getElementById("backupFileInput").click();
    });
    document.getElementById("backupFileInput").addEventListener("change", importBackup);
  }

  function render() {
    document.getElementById("dailyApiUrl").value = Api.CONFIG.dailyApiUrl || "";
    document.getElementById("photoApiUrl").value = Api.CONFIG.photoApiUrl || "";
    updateStatus();
  }

  function save() {
    Api.CONFIG.dailyApiUrl = document.getElementById("dailyApiUrl").value.trim();
    Api.CONFIG.photoApiUrl = document.getElementById("photoApiUrl").value.trim();
    Api.saveConfig();
    updateStatus();
    App.toast("설정을 저장했습니다.");
  }

  function updateStatus() {
    const status = document.getElementById("storageStatus");
    if (!status) return;
    status.textContent = Api.CONFIG.dailyApiUrl
      ? "현재 저장 방식: Google Spreadsheet DB"
      : "현재 저장 방식: 브라우저 임시 저장";
  }

  function exportBackup() {
    const backup = {
      exported_at: new Date().toISOString(),
      masterItems: read("masterItems", []),
      dailyReports: read("dailyReports", [])
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `field-daily-hub-backup-${DailyKeys.today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    App.toast("백업 파일을 만들었습니다.");
  }

  function importBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result));
        if (Array.isArray(backup.masterItems)) write("masterItems", backup.masterItems);
        if (Array.isArray(backup.dailyReports)) write("dailyReports", backup.dailyReports);
        Master.load();
        App.toast("백업 데이터를 불러왔습니다.");
      } catch (error) {
        App.toast("백업 파일을 읽지 못했습니다.");
      }
      event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(storagePrefix + key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(storagePrefix + key, JSON.stringify(value));
  }

  return {
    init,
    render
  };
})();
