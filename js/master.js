const Master = (() => {
  const types = {
    trade: "masterTrade",
    material: "masterMaterial",
    equipment: "masterEquipment",
    company: "masterCompany",
    location: "masterLocation",
    unit: "masterUnit"
  };

  function defaultItems() {
    return [
      { code_type: "trade", code_name: "가설공사" },
      { code_type: "trade", code_name: "철근공사" },
      { code_type: "trade", code_name: "콘크리트공사" },
      { code_type: "trade", code_name: "전기공사" },
      { code_type: "material", code_name: "철근" },
      { code_type: "material", code_name: "레미콘" },
      { code_type: "material", code_name: "거푸집" },
      { code_type: "equipment", code_name: "크레인" },
      { code_type: "equipment", code_name: "굴삭기" },
      { code_type: "equipment", code_name: "펌프카" },
      { code_type: "company", code_name: "원청" },
      { code_type: "location", code_name: "1층 A구간" },
      { code_type: "location", code_name: "지하 1층" },
      { code_type: "unit", code_name: "명" },
      { code_type: "unit", code_name: "대" },
      { code_type: "unit", code_name: "m3" },
      { code_type: "unit", code_name: "ton" }
    ];
  }

  function group(items) {
    return Object.keys(types).reduce((acc, type) => {
      acc[type] = items.filter((item) => item.code_type === type).map((item) => item.code_name);
      return acc;
    }, {});
  }

  function render(items = defaultItems()) {
    const grouped = group(items);
    Object.entries(types).forEach(([type, id]) => {
      const textarea = document.getElementById(id);
      if (textarea) textarea.value = (grouped[type] || []).join("\n");
    });
    renderLists(grouped);
  }

  function read() {
    return Object.entries(types).flatMap(([type, id]) => {
      const value = document.getElementById(id).value;
      return value.split("\n")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
          code_id: `${type.toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
          code_type: type,
          code_name: name,
          alias: "",
          sort_order: index + 1,
          active: "Y"
        }));
    });
  }

  function renderLists(grouped = group(read())) {
    setOptions("tradeList", grouped.trade);
    setOptions("materialList", grouped.material);
    setOptions("equipmentList", grouped.equipment);
    setOptions("companyList", grouped.company);
    setOptions("locationList", grouped.location);
    setOptions("unitList", grouped.unit);
    setSelect("tradeFilter", grouped.trade);
    setSelect("materialFilter", grouped.material);
    setSelect("equipmentFilter", grouped.equipment);
  }

  function setOptions(id, values = []) {
    const list = document.getElementById(id);
    if (!list) return;
    list.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
  }

  function setSelect(id, values = []) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = `<option value="">전체</option>` + values
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("");
  }

  async function load() {
    const result = await Api.request("get_master");
    render(result.items || defaultItems());
  }

  async function save() {
    const items = read();
    const result = await Api.request("save_master", { items });
    render(items);
    App.toast(result.status === "ok" ? "기준정보를 저장했습니다." : "기준정보 저장에 실패했습니다.");
  }

  function restore() {
    render(defaultItems());
    App.toast("기본 기준정보를 복원했습니다.");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  return {
    defaultItems,
    load,
    save,
    restore,
    read,
    escapeHtml
  };
})();
