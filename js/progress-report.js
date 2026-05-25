const ProgressReport = (() => {
  function init() {
    setDefaultDates();
    document.getElementById("buildWeeklyReportBtn").addEventListener("click", () => render("weekly"));
    document.getElementById("buildMonthlyReportBtn").addEventListener("click", () => render("monthly"));
  }

  function setDefaultDates() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    document.getElementById("progressStartDate").value = toDateInput(start);
    document.getElementById("progressEndDate").value = toDateInput(end);
  }

  async function render(type) {
    const daily = Daily.collect();
    const report = buildReport(type, daily);
    const target = document.getElementById("progressReportPreview");
    target.className = "print-preview show";
    target.innerHTML = `
      <div class="print-toolbar">
        <strong>${report.title} 미리보기</strong>
        <button type="button" id="progressPrintBtn">브라우저 인쇄</button>
      </div>
      <article class="print-page progress-page">
        <h2 class="document-title">${report.title}</h2>
        <div class="print-meta progress-meta">
          ${meta("공사명", report.project)}
          ${meta("보고기간", report.period)}
          ${meta("작성자", report.writer)}
          ${meta("보고일", report.reportDate)}
        </div>
        ${sectionKeyValue("1. " + report.summaryTitle, report.summary)}
        ${sectionTable("2. 공종별 진행현황", ["공종", "주요 작업내용", "작업부위", "출역누계", "진행률"], report.tradeProgress, ["trade", "content", "location", "manpower", "progress"])}
        ${sectionTable("3. 출역 누계", ["공종", "출역 누계", "비고"], report.manpowerTotal, ["trade", "manpower", "note"])}
        ${sectionTable("4. 장비 사용 누계", ["장비명", "사용누계", "주요 사용내용"], report.equipmentTotal, ["name", "qty", "desc"])}
        ${sectionTable("5. 자재 반입/사용 누계", ["공종", "자재명", "규격", "반입량", "사용량", "잔량", "단위"], report.materialTotal, ["trade", "name", "spec", "in_qty", "use_qty", "remain_qty", "unit"])}
        ${sectionTable("6. " + report.nextTitle, ["공종", "예정 작업", "예정 부위", "필요 자재/장비", "비고"], report.nextPlan, ["trade", "plan", "location", "needs", "note"])}
      </article>
    `;
    document.getElementById("progressPrintBtn").addEventListener("click", () => window.print());
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    App.toast(`${report.title} 미리보기를 만들었습니다.`);
  }

  function buildReport(type, daily) {
    const projectInput = document.getElementById("progressProjectName").value.trim();
    const writerInput = document.getElementById("progressWriter").value.trim();
    const start = document.getElementById("progressStartDate").value;
    const end = document.getElementById("progressEndDate").value;
    const isMonthly = type === "monthly";

    const works = daily.works.length ? daily.works : sampleWorks();
    const equipment = daily.equipment.length ? daily.equipment : sampleEquipment();
    const materials = daily.materials.length ? daily.materials : sampleMaterials();

    return {
      title: isMonthly ? "월 간 공 정 보 고 서" : "주 간 공 정 보 고 서",
      summaryTitle: isMonthly ? "금월 공정 요약" : "금주 공정 요약",
      nextTitle: isMonthly ? "다음 달 예정공정" : "다음 주 예정공정",
      project: projectInput || daily.report.site || "",
      period: `${start || "-"} ~ ${end || "-"}`,
      writer: writerInput || daily.report.writer || "",
      reportDate: DailyKeys.today(),
      summary: [
        { label: isMonthly ? "금월 주요작업" : "금주 주요작업", value: summarizeWorks(works) },
        { label: isMonthly ? "금월 특이사항" : "금주 특이사항", value: daily.report.note || "우천으로 외부 작업 일부 지연" },
        { label: "주요 공정 이슈", value: "자재 반입 일정 조정" }
      ],
      tradeProgress: works.map((item) => ({
        trade: item.trade,
        content: item.content,
        location: item.location,
        manpower: formatCount(item.manpower, "명"),
        progress: item.progress
      })),
      manpowerTotal: buildManpowerTotal(works),
      equipmentTotal: equipment.map((item) => ({
        name: item.name,
        qty: formatCount(item.qty, "대"),
        desc: item.desc
      })),
      materialTotal: materials.map((item) => ({
        ...item,
        remain_qty: Number(item.in_qty || 0) - Number(item.use_qty || 0)
      })),
      nextPlan: buildNextPlan(works, materials, daily.report.tomorrow)
    };
  }

  function buildManpowerTotal(works) {
    const map = works.reduce((acc, item) => {
      const trade = item.trade || "미분류";
      acc[trade] = (acc[trade] || 0) + Number(item.manpower || 0);
      return acc;
    }, {});
    const rows = Object.entries(map).map(([trade, manpower]) => ({
      trade,
      manpower: formatCount(manpower, "명"),
      note: ""
    }));
    const total = rows.reduce((sum, row) => sum + Number(String(row.manpower).replace(/[^0-9.-]/g, "")), 0);
    rows.push({ trade: "합계", manpower: formatCount(total, "명"), note: "" });
    return rows;
  }

  function buildNextPlan(works, materials, tomorrow) {
    const firstMaterial = materials[0];
    return works.map((item, index) => ({
      trade: item.trade,
      plan: index === 0 && tomorrow ? tomorrow : nextPlanText(item),
      location: nextLocation(item.location),
      needs: firstMaterial ? [firstMaterial.name, firstMaterial.spec].filter(Boolean).join(" ") : "",
      note: ""
    }));
  }

  function nextPlanText(item) {
    if (!item.content) return "";
    return item.content.replace("1층", "2층").replace("금주", "다음 주");
  }

  function nextLocation(location) {
    return String(location || "").replace("1층", "2층");
  }

  function summarizeWorks(works) {
    return works.map((item) => item.content).filter(Boolean).join(", ") || "철근배근, 거푸집 설치";
  }

  function sectionKeyValue(title, rows) {
    return `
      <section class="print-section">
        <h3>${safe(title)}</h3>
        <table class="print-table">
          <thead><tr><th>구분</th><th>내용</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${safe(row.label)}</td><td>${safe(row.value)}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  function sectionTable(title, headers, rows, fields) {
    const body = rows.length ? rows.map((row) => `
      <tr>${fields.map((field) => `<td>${safe(row[field])}</td>`).join("")}</tr>
    `).join("") : `<tr><td colspan="${headers.length}">조회된 내용 없음</td></tr>`;

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

  function meta(label, value) {
    return `<div><b>${safe(label)}</b><span>${safe(value)}</span></div>`;
  }

  function sampleWorks() {
    return [
      { trade: "철근공사", content: "벽체 철근배근", location: "1층 A구간", manpower: 42, progress: "35%" },
      { trade: "거푸집공사", content: "벽체 거푸집 설치", location: "1층 B구간", manpower: 38, progress: "30%" }
    ];
  }

  function sampleEquipment() {
    return [
      { name: "크레인", qty: 5, desc: "철근 양중" },
      { name: "굴삭기 06", qty: 3, desc: "터파기 정리" }
    ];
  }

  function sampleMaterials() {
    return [
      { trade: "철근공사", name: "철근", spec: "D13", in_qty: 10, use_qty: 7, unit: "ton" },
      { trade: "콘크리트공사", name: "레미콘", spec: "25-24-150", in_qty: 120, use_qty: 120, unit: "m3" }
    ];
  }

  function formatCount(value, unit) {
    if (String(value || "").includes(unit)) return value;
    return `${value || 0}${unit}`;
  }

  function toDateInput(date) {
    return date.toISOString().slice(0, 10);
  }

  function safe(value) {
    return Master.escapeHtml(value === undefined || value === null ? "" : value);
  }

  return {
    init,
    render
  };
})();
