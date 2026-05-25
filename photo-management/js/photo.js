const Categories = (() => {
  const items = [
    { code: "CONST", name: "현장시공사진", folder: "시공" },
    { code: "SAFE", name: "안전사진", folder: "안전" },
    { code: "TBM", name: "TBM", folder: "TBM" },
    { code: "QUAL", name: "품질사진", folder: "품질" },
    { code: "ENV", name: "환경사진", folder: "환경" },
    { code: "ETC", name: "기타", folder: "기타" }
  ];

  function find(code) {
    return items.find((item) => item.code === code) || items[0];
  }

  return { items, find };
})();

const Photo = (() => {
  const state = {
    queue: []
  };

  function init() {
    const today = App.today();
    document.getElementById("photoDate").value = today;
    document.getElementById("todayLabel").textContent = today;
    renderCategorySelects();
    bindInputs();
    renderQueue();
  }

  function renderCategorySelects() {
    const html = Categories.items.map((item) => `<option value="${item.code}">${item.name}</option>`).join("");
    ["photoCategory", "searchCategory", "pdfCategory"].forEach((id) => {
      const select = document.getElementById(id);
      select.innerHTML = id === "searchCategory" ? `<option value="">전체</option>${html}` : html;
    });
  }

  function bindInputs() {
    document.getElementById("cameraBtn").addEventListener("click", () => document.getElementById("cameraInput").click());
    document.getElementById("galleryBtn").addEventListener("click", () => document.getElementById("galleryInput").click());
    document.getElementById("cameraInput").addEventListener("change", addFiles);
    document.getElementById("galleryInput").addEventListener("change", addFiles);
    document.getElementById("clearQueueBtn").addEventListener("click", () => {
      state.queue = [];
      renderQueue();
    });
    document.getElementById("savePhotosBtn").addEventListener("click", save);
  }

  async function addFiles(event) {
    const files = Array.from(event.target.files || []);
    const loaded = await Promise.all(files.map(fileToItem));
    state.queue.push(...loaded);
    event.target.value = "";
    renderQueue();
  }

  function fileToItem(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          file,
          file_name: file.name,
          file_type: file.type || "image/jpeg",
          file_size: file.size,
          data_url: String(reader.result),
          base64: String(reader.result).split(",")[1]
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderQueue() {
    const target = document.getElementById("photoQueue");
    if (!state.queue.length) {
      target.className = "photo-grid empty";
      target.textContent = "촬영 또는 갤러리에서 사진을 선택하세요.";
      return;
    }
    target.className = "photo-grid";
    target.innerHTML = state.queue.map((item, index) => cardHtml(item, index, true)).join("");
    target.querySelectorAll("[data-remove-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        state.queue.splice(Number(button.dataset.removePhoto), 1);
        renderQueue();
      });
    });
  }

  async function save() {
    if (!state.queue.length) {
      App.toast("저장할 사진을 선택하세요.");
      return;
    }
    const meta = readMeta();
    const category = Categories.find(meta.category);
    const photos = state.queue.map((item) => ({
      ...meta,
      date_code: Api.dateCode(meta.photo_date),
      category_name: category.name,
      file_name: item.file_name,
      file_type: item.file_type,
      base64: item.base64,
      data_url: item.data_url
    }));
    const result = await Api.request("save_photos", { photos });
    if (result.status === "ok") {
      state.queue = [];
      renderQueue();
      App.toast(`${photos.length}장의 사진을 저장했습니다.`);
      return;
    }
    App.toast("사진 저장에 실패했습니다.");
  }

  function readMeta() {
    return {
      photo_date: document.getElementById("photoDate").value,
      category: document.getElementById("photoCategory").value,
      trade: document.getElementById("photoTrade").value.trim(),
      location: document.getElementById("photoLocation").value.trim(),
      content: document.getElementById("photoContent").value.trim(),
      photographer: document.getElementById("photographer").value.trim(),
      memo: document.getElementById("photoMemo").value.trim()
    };
  }

  function cardHtml(item, index, removable) {
    const src = item.thumb_url || item.file_url || item.data_url || "";
    return `
      <article class="photo-card">
        <img src="${App.escape(src)}" alt="">
        <div class="body">
          <strong>${App.escape(item.content || item.file_name || "사진")}</strong>
          <span>${App.escape(item.category_name || "")} · ${App.escape(item.photo_date || "")}</span>
          <span>${App.escape(item.trade || "")} ${App.escape(item.location || "")}</span>
          ${removable ? `<button type="button" class="danger small" data-remove-photo="${index}">삭제</button>` : ""}
        </div>
      </article>
    `;
  }

  return {
    init,
    cardHtml
  };
})();
