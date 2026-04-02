(async function () {
  const container = document.getElementById("tag-list");
  if (!container) return;

  let currentPage = 1;
  let currentLimit = 5;
  let totalPages = 1;
  let menuTargets = [];
  let groupTargets = [];

  function toSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function renderPagination() {
    const paginationDiv = document.getElementById("tag-pagination-controls");
    if (!paginationDiv) return;

    if (totalPages <= 1) {
      paginationDiv.style.display = "none";
      return;
    }

    paginationDiv.style.display = "block";
    let paginationHtml =
      '<div style="display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;">';

    if (currentPage > 1) {
      paginationHtml += `<button class="pagination-btn" onclick="window.tagGoToPage(1)" style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;transition:.2s;">« First</button>`;
      paginationHtml += `<button class="pagination-btn" onclick="window.tagGoToPage(${
        currentPage - 1
      })" style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;transition:.2s;">‹ Prev</button>`;
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i += 1) {
      const isActive = i === currentPage;
      const btnStyle = isActive
        ? "background:var(--ui-navy);color:var(--ui-bronze);font-weight:700;"
        : "background:#fff;color:#333;";
      paginationHtml += `<button class="pagination-btn" onclick="window.tagGoToPage(${i})" style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;${btnStyle}cursor:pointer;transition:.2s;">${i}</button>`;
    }

    if (currentPage < totalPages) {
      paginationHtml += `<button class="pagination-btn" onclick="window.tagGoToPage(${
        currentPage + 1
      })" style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;transition:.2s;">Next ›</button>`;
      paginationHtml += `<button class="pagination-btn" onclick="window.tagGoToPage(${totalPages})" style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;transition:.2s;">Last »</button>`;
    }

    paginationHtml += `<span style="margin-left:16px;font-size:.85rem;color:#666;">Page ${currentPage}/${totalPages}</span>`;
    paginationHtml += "</div>";
    paginationDiv.innerHTML = paginationHtml;
  }

  function normalizeTitle(value, fallback) {
    return String(value || fallback || "").trim();
  }

  function summarizeSpecificValues(values) {
    const normalizedValues = Array.isArray(values) ? values : [];
    if (!normalizedValues.length) {
      return {
        text: "all menus",
        title: "all menus",
      };
    }

    const labels = normalizedValues.map((value) => {
      const { targetType, specificId } = parseSpecificValue(value);
      if (!specificId) {
        return targetType === "group" ? "all groups" : "all menus";
      }

      const source = targetType === "group" ? groupTargets : menuTargets;
      const matched = source.find((item) => String(item.id) === String(specificId));
      const name = matched?.name || specificId;
      return `${targetType === "group" ? "group" : "menu"} | ${name}`;
    });

    if (labels.length === 1) {
      return {
        text: labels[0],
        title: labels[0],
      };
    }

    const summary = {
      menu: 0,
      group: 0,
      allMenus: false,
      allGroups: false,
    };

    normalizedValues.forEach((value) => {
      const { targetType, specificId } = parseSpecificValue(value);
      if (targetType === "group") {
        if (!specificId) summary.allGroups = true;
        else summary.group += 1;
        return;
      }

      if (!specificId) summary.allMenus = true;
      else summary.menu += 1;
    });

    const parts = [];
    if (summary.allMenus) parts.push("all menus");
    else if (summary.menu) parts.push(`${summary.menu} menu${summary.menu > 1 ? "s" : ""}`);

    if (summary.allGroups) parts.push("all groups");
    else if (summary.group) parts.push(`${summary.group} group${summary.group > 1 ? "s" : ""}`);

    return {
      text: parts.join(", ") || `${labels.length} targets`,
      title: labels.join("\n"),
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function composeSpecificValue(targetType, specificId) {
    const normalizedType = targetType === "group" ? "group" : "menu";
    return `${normalizedType}:${String(specificId || "")}`;
  }

  function parseSpecificValue(value) {
    const [rawType, ...rest] = String(value || "menu:").split(":");
    const targetType = rawType === "group" ? "group" : "menu";
    const specificId = rest.join(":").trim();
    return {
      targetType,
      specificId,
    };
  }

  function getSelectedSpecificValues(tr) {
    const select = tr?.querySelector('select[name="specificTargets"]');
    if (!select) return ["menu:"];

    const values = Array.from(select.selectedOptions || [])
      .map((option) => option.value)
      .filter(Boolean);

    return values.length ? values : ["menu:"];
  }

  function getSpecificOptionsMarkup(selectedValues) {
    const selectedSet = new Set(
      (Array.isArray(selectedValues) ? selectedValues : [selectedValues || "menu:"])
        .map((value) => String(value || "menu:"))
    );
    let html = "";

    const globalOptions = [
      { value: "menu:", label: "all menus" },
      { value: "group:", label: "all groups" },
    ];

    globalOptions.forEach((option) => {
      html += `<option value="${option.value}" ${
        selectedSet.has(option.value) ? "selected" : ""
      }>${escapeHtml(option.label)}</option>`;
    });

    if (menuTargets.length) {
      html += '<optgroup label="menus">';
      menuTargets.forEach((item) => {
        const value = composeSpecificValue("menu", item.id);
        html += `<option value="${value}" ${
          selectedSet.has(value) ? "selected" : ""
        }>menu | ${escapeHtml(item.name || item.id)}</option>`;
      });
      html += "</optgroup>";
    }

    if (groupTargets.length) {
      html += '<optgroup label="groups">';
      groupTargets.forEach((item) => {
        const value = composeSpecificValue("group", item.id);
        html += `<option value="${value}" ${
          selectedSet.has(value) ? "selected" : ""
        }>group | ${escapeHtml(item.name || item.id)}</option>`;
      });
      html += "</optgroup>";
    }

    return html;
  }

  async function loadSpecificTargets() {
    const [menuResp, groupResp] = await Promise.all([
      fetch("/api/menus?limit=300"),
      fetch("/groups?limit=300"),
    ]);

    const [menuData, groupData] = await Promise.all([
      menuResp.json(),
      groupResp.json(),
    ]);

    const menuList = Array.isArray(menuData?.data)
      ? menuData.data
      : Array.isArray(menuData)
      ? menuData
      : [];

    const groupList = Array.isArray(groupData?.groups)
      ? groupData.groups
      : Array.isArray(groupData?.data)
      ? groupData.data
      : Array.isArray(groupData)
      ? groupData
      : [];

    menuTargets = menuList.map((menu) => ({
      id: menu?._id || "",
      name: normalizeTitle(menu?.title?.en || menu?.title, menu?._id),
    }));

    groupTargets = groupList.map((group) => ({
      id: group?._id || "",
      name: normalizeTitle(group?.title?.en || group?.title, group?._id),
    }));
  }

  window.tagGoToPage = function (page) {
    currentPage = page;
    fetchItems();
  };

  function initSpecificSelectSearch() {
    if (typeof window.jQuery === "undefined") return;
    if (typeof window.jQuery.fn.select2 !== "function") return;

    function updateSpecificSummary($select) {
      const values = $select.val() || [];
      const summary = summarizeSpecificValues(values);
      const $container = $select.next(".select2-container");
      const $selection = $container.find(".select2-selection--multiple");
      let $summary = $selection.find(".tag-select-summary");

      if (!$summary.length) {
        $summary = window.jQuery('<span class="tag-select-summary"></span>');
        $selection.append($summary);
      }

      $summary.text(summary.text);
      $summary.attr("title", summary.title);
    }

    window.jQuery(container)
      .find('select[name="specificTargets"]')
      .each(function () {
        const $select = window.jQuery(this);
        if ($select.hasClass("select2-hidden-accessible")) {
          $select.select2("destroy");
        }

        $select.select2({
          width: "100%",
          dropdownAutoWidth: true,
          placeholder: "Search specific...",
          closeOnSelect: false,
          minimumResultsForSearch: 0,
        });

        updateSpecificSummary($select);
        $select.off("select2:open.searchFocus");
        $select.on("select2:open.searchFocus", function () {
          setTimeout(() => {
            const searchInput = document.querySelector(
              ".select2-container--open .select2-search__field"
            );
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }, 0);
        });

        $select.off("change.selectSummary select2:close.selectSummary");
        $select.on("change.selectSummary select2:close.selectSummary", function () {
          updateSpecificSummary($select);
        });
      });
  }

  function render(items) {
    let html =
      '<table class="table-clean"><thead><tr><th>Name</th><th>Slug</th><th>Specific</th><th class="text-center">Status</th><th class="text-end">Actions</th></tr></thead><tbody id="tag-list-body">';

    html += `
      <tr class="new-item-row" data-id="new" style="display:none;">
        <td>
          <input type="text" name="name" class="inline-input" placeholder="Tag name" value="" />
        </td>
        <td>
          <input type="text" name="slug" class="inline-input small" placeholder="auto-from-name" value="" readonly />
        </td>
        <td>
          <select name="specificTargets" class="tag-specific-select" multiple>
            ${getSpecificOptionsMarkup(["menu:"])}
          </select>
        </td>
        <td class="text-center">
          <span class="badge-minimal badge-active">SHOW</span>
          <input type="hidden" name="isStatus" value="true" />
        </td>
        <td class="text-end">
          <button class="action-circle" onclick="toggleInlineStatus(this)" title="Toggle status">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>
          <button class="btn-action-minimal create-item">Create</button>
          <button class="action-circle cancel-create" title="Cancel">✕</button>
        </td>
      </tr>
    `;

    if (items && items.length) {
      items.forEach((it) => {
        const selectedSpecificValues = Array.isArray(it.specificTargets) &&
          it.specificTargets.length
          ? it.specificTargets.map((target) =>
              composeSpecificValue(target.targetType || "menu", target.specificId || "")
            )
          : [composeSpecificValue(it.targetType || "menu", it.specificId || "")];

        html += `
          <tr data-id="${it._id}">
            <td>
              <input type="text" name="name" class="inline-input" value="${
                it.name || ""
              }" />
            </td>
            <td>
              <input type="text" name="slug" class="inline-input small" value="${
                it.slug || ""
              }" readonly />
            </td>
            <td>
              <select name="specificTargets" class="tag-specific-select" multiple>
                ${getSpecificOptionsMarkup(selectedSpecificValues)}
              </select>
            </td>
            <td class="text-center">
              <span class="badge-minimal ${
                it.isStatus ? "badge-active" : ""
              }">${it.isStatus ? "SHOW" : "HIDE"}</span>
            </td>
            <td class="text-end">
              <button class="action-circle" onclick="toggleTagStatus('${
                it._id
              }', this)" title="Toggle status">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
              <button class="btn-action-minimal save-row" data-id="${
                it._id
              }">Save</button>
              <button class="action-circle" onclick="deleteTag('${
                it._id
              }', this)" title="Delete">🗑</button>
            </td>
          </tr>
        `;
      });
    } else {
      html += `
        <tr>
          <td colspan="5" class="text-center p-5 text-muted">
            No tags found. Click "ADD TAG" to create your first one.
          </td>
        </tr>
      `;
    }

    html += "</tbody></table>";
    container.innerHTML = html;
    initSpecificSelectSearch();
    renderPagination();
  }

  async function fetchItems() {
    const search = document.getElementById("tagSearchInput")?.value || "";
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", currentPage);
    params.append("limit", currentLimit);

    try {
      const r = await fetch(`/api/tags?${params.toString()}`);
      const d = await r.json();

      if (d && d.success && Array.isArray(d.data)) {
        const pagination = d.pagination || {};
        currentPage = pagination.page || 1;
        totalPages = pagination.totalPages || 1;
        render(d.data);
        return;
      }

      render([]);
    } catch (err) {
      render([]);
      showToast("Cannot load tags", true);
    }
  }

  window.toggleInlineStatus = function (btn) {
    const tr = btn.closest("tr");
    const badge = tr.querySelector(".badge-minimal");
    const hiddenInput = tr.querySelector('input[name="isStatus"]');
    const isActive = badge.classList.contains("badge-active");

    if (isActive) {
      badge.classList.remove("badge-active");
      badge.textContent = "HIDE";
      if (hiddenInput) hiddenInput.value = "false";
    } else {
      badge.classList.add("badge-active");
      badge.textContent = "SHOW";
      if (hiddenInput) hiddenInput.value = "true";
    }
  };

  window.toggleTagStatus = async function (id, btn) {
    try {
      btn.disabled = true;
      const r = await fetch(`/api/tags/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.success) {
        const tr = btn.closest("tr");
        const badge = tr.querySelector(".badge-minimal");
        if (badge) {
          if (d.isStatus) {
            badge.classList.add("badge-active");
            badge.textContent = "SHOW";
          } else {
            badge.classList.remove("badge-active");
            badge.textContent = "HIDE";
          }
        }
        showToast("Status updated");
      } else {
        showToast(d.message || "Toggle failed", true);
      }
    } catch (err) {
      showToast("Toggle failed", true);
    } finally {
      btn.disabled = false;
    }
  };

  window.deleteTag = async function (id, btn) {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      btn.disabled = true;
      const r = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.success) {
        showToast("Tag deleted");
        fetchItems();
      } else {
        showToast(d.message || "Delete failed", true);
      }
    } catch (err) {
      showToast("Delete failed", true);
    } finally {
      btn.disabled = false;
    }
  };

  container.addEventListener("click", async (ev) => {
    if (ev.target.closest(".create-item")) {
      const btn = ev.target.closest(".create-item");
      const tr = btn.closest("tr");
      btn.disabled = true;

      const name = tr.querySelector('input[name="name"]')?.value.trim() || "";
      const specificTargets = getSelectedSpecificValues(tr);
      const isStatus =
        tr.querySelector('input[name="isStatus"]')?.value === "true";

      if (!name) {
        showToast("Name is required", true);
        btn.disabled = false;
        return;
      }

      try {
        const r = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, specificTargets }),
        });
        const d = await r.json();

        if (!d.success) {
          showToast(d.message || "Create failed", true);
          return;
        }

        if (isStatus === false && d.data && d.data._id) {
          await fetch(`/api/tags/${d.data._id}/toggle`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          });
        }

        showToast("Tag created");
        tr.style.display = "none";
        tr.querySelectorAll('input[type="text"]').forEach((inp) => {
          inp.value = "";
        });
        const specificTargetsSelect = tr.querySelector(
          'select[name="specificTargets"]'
        );
        if (specificTargetsSelect) {
          specificTargetsSelect.innerHTML = getSpecificOptionsMarkup(["menu:"]);
          initSpecificSelectSearch();
        }
        const statusInput = tr.querySelector('input[name="isStatus"]');
        const badge = tr.querySelector(".badge-minimal");
        if (statusInput) statusInput.value = "true";
        if (badge) {
          badge.classList.add("badge-active");
          badge.textContent = "SHOW";
        }
        fetchItems();
      } catch (err) {
        showToast("Create failed", true);
      } finally {
        btn.disabled = false;
      }
      return;
    }

    if (ev.target.closest(".cancel-create")) {
      const tr = ev.target.closest("tr");
      tr.style.display = "none";
      tr.querySelectorAll('input[type="text"]').forEach((inp) => {
        inp.value = "";
      });
      const specificTargetsSelect = tr.querySelector(
        'select[name="specificTargets"]'
      );
      if (specificTargetsSelect) {
        specificTargetsSelect.innerHTML = getSpecificOptionsMarkup(["menu:"]);
        initSpecificSelectSearch();
      }
      const statusInput = tr.querySelector('input[name="isStatus"]');
      const badge = tr.querySelector(".badge-minimal");
      if (statusInput) statusInput.value = "true";
      if (badge) {
        badge.classList.add("badge-active");
        badge.textContent = "SHOW";
      }
      return;
    }

    const saveBtn = ev.target.closest(".save-row");
    if (!saveBtn) return;

    const tr = saveBtn.closest("tr");
    const id = tr.dataset.id;
    const name = tr.querySelector('input[name="name"]')?.value.trim() || "";
    const specificTargets = getSelectedSpecificValues(tr);
    if (!name) {
      showToast("Name is required", true);
      return;
    }

    saveBtn.disabled = true;
    try {
      const r = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, specificTargets }),
      });
      const d = await r.json();
      if (d.success) {
        showToast("Saved");
        if (d.data && d.data.slug) {
          const slugInput = tr.querySelector('input[name="slug"]');
          if (slugInput) slugInput.value = d.data.slug;
        }
      } else {
        showToast(d.message || "Save failed", true);
      }
    } catch (err) {
      showToast("Save failed", true);
    } finally {
      saveBtn.disabled = false;
    }
  });

  container.addEventListener("input", (ev) => {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name !== "name") return;

    const tr = input.closest("tr");
    if (!tr) return;

    const slugInput = tr.querySelector('input[name="slug"]');
    if (!slugInput) return;
    slugInput.value = toSlug(input.value);
  });

  document.getElementById("add-tag-btn")?.addEventListener("click", () => {
    const newRow = container.querySelector(".new-item-row");
    if (!newRow) return;
    newRow.style.display = "";
    const nameInput = newRow.querySelector('input[name="name"]');
    if (nameInput) nameInput.focus();
  });

  document.getElementById("tagSearchInput")?.addEventListener("input", () => {
    currentPage = 1;
    fetchItems();
  });

  document
    .getElementById("tagPageLimitSelect")
    ?.addEventListener("change", (e) => {
      currentLimit = parseInt(e.target.value, 10);
      currentPage = 1;
      fetchItems();
    });

  try {
    await loadSpecificTargets();
  } catch (err) {
    menuTargets = [];
    groupTargets = [];
    showToast("Cannot load menu/group targets", true);
  }

  await fetchItems();
})();
