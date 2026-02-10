(async function () {
  const container = document.getElementById("social-list");
  if (!container) return;

  function render(items) {
    let html = `<table class="table-clean"><thead><tr><th></th><th>Details</th><th>Order</th><th class="text-center">Status</th><th class="text-end">Actions</th></tr></thead><tbody id="social-list-body">`;

    // Add empty row for creating new items
    html += `
    <tr class="new-item-row" data-id="new" style="display: none;">
      <td class="text-center"><span style="color: #ccc;">✚</span></td>
      <td>
        <div class="d-flex align-items-center">
          <div class="icon-preview" onclick="openIconPicker(this, this.closest('tr'))"><i class="fas fa-plus"></i></div>
          <div style="max-width:600px">
            <input type="hidden" name="iconClass" value="" />
            <input type="text" name="name[]" class="inline-input details-title" placeholder="Name" value="" />
            <input type="text" name="url[]" class="inline-input small details-sub" placeholder="URL" value="" />
          </div>
        </div>
      </td>
      <td><input type="number" name="order[]" class="form-control-minimal order-input" value="${
        (items && items.length) || 0
      }" style="width:72px;text-align:center"/></td>
      <td class="text-center">
        <span class="badge-minimal badge-active">SHOW</span>
        <input type="hidden" name="isStatus[]" value="true"/>
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
    </tr>`;

    if (items && items.length) {
      items.forEach((it) => {
        const imgHtml = it.iconImage
          ? `<img src="${it.iconImage}" style="width:60px;height:45px;object-fit:cover;border-radius:4px;margin-right:12px"/>`
          : `<div class="icon-preview" onclick="openIconPicker(this, this.closest('tr'))"><i class="${
              it.iconClass || "fas fa-question"
            }"></i></div>`;
        html += `
        <tr data-id="${it._id}">
          <td class="text-center drag-cell"><span class="drag-handle">≡</span></td>
          <td>
            <div class="d-flex align-items-center">
              ${imgHtml}
              <div style="max-width:600px">
                <input type="hidden" name="id[]" value="${it._id}">
                <input type="hidden" name="iconClass" value="${
                  it.iconClass || ""
                }">
                <input type="text" name="name[]" class="inline-input details-title" value="${
                  it.name || ""
                }" />
                <input type="text" name="url[]" class="inline-input small details-sub" value="${
                  it.url || ""
                }" />
              </div>
            </div>
          </td>
          <td><input type="number" name="order[]" class="form-control-minimal order-input" value="${
            it.order || 0
          }" style="width:72px;text-align:center"/></td>
          <td class="text-center">
            <span class="badge-minimal ${it.isStatus ? "badge-active" : ""}">${
          it.isStatus ? "SHOW" : "HIDE"
        }</span>
          </td>
          <td class="text-end">
            <button class="action-circle" onclick="toggleSocialStatus('${
              it._id
            }', this)" title="Toggle status">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
            <button class="btn-action-minimal save-row" data-id="${
              it._id
            }">Save</button>
            <button class="action-circle btn-del" onclick="deleteSocial('${
              it._id
            }', this)" title="Delete">🗑</button>
          </td>
        </tr>`;
      });
    } else {
      // Show empty message when no items
      html += `
      <tr>
        <td colspan="5" class="text-center p-5 text-muted">
          No social items yet. Click "ADD ITEM" to create your first one.
        </td>
      </tr>`;
    }

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  async function fetchItems() {
    const r = await fetch("/api/socials");
    const d = await r.json();
    return (d && d.items) || [];
  }

  // Sortable support
  async function initSortable() {
    const tbody = document.getElementById("social-list-body");
    if (!tbody) return;
    if (!window.Sortable) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js";
      document.head.appendChild(s);
      await new Promise((res) => (s.onload = res));
    }
    Sortable.create(tbody, {
      handle: ".drag-handle",
      filter: ".new-item-row", // exclude the create row from dragging
      preventOnFilter: false,
      onEnd: async () => {
        const rows = Array.from(tbody.children).filter(
          (tr) => tr.dataset.id !== "new"
        );
        const items = rows.map((tr, idx) => ({
          _id: tr.dataset.id,
          order: idx,
        }));
        // update order input values in DOM
        rows.forEach((tr, idx) => {
          const orderInput = tr.querySelector(".order-input");
          if (orderInput) orderInput.value = idx;
        });
        // update via POST to /api/socials
        try {
          const r = await fetch("/api/socials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          const d = await r.json();
          if (d.success) showToast("Order saved");
          else showToast("Order save failed", true);
        } catch (err) {
          showToast("Order save failed", true);
        }
      },
    });

    // Add item button
    document.getElementById("add-item-btn")?.addEventListener("click", () => {
      const newRow = container.querySelector(".new-item-row");
      if (newRow) {
        newRow.style.display = "";
        const nameInput = newRow.querySelector('input[name="name[]"]');
        if (nameInput) nameInput.focus();
      }
    });

    // delegated click listener for Save buttons, Create buttons, and Cancel
    container.addEventListener("click", async (ev) => {
      // Handle create new item
      if (ev.target.closest(".create-item")) {
        const btn = ev.target.closest(".create-item");
        const tr = btn.closest("tr");
        btn.disabled = true;
        const name = tr.querySelector('input[name="name[]"]').value.trim();
        const url = tr.querySelector('input[name="url[]"]').value.trim();
        const iconClass =
          tr.querySelector('input[name="iconClass"]')?.value || "";
        const order =
          parseInt(tr.querySelector('input[name="order[]"]').value, 10) || 0;
        const isStatus =
          tr.querySelector('input[name="isStatus[]"]').value === "true";

        if (!name) {
          showToast("Name is required", true);
          btn.disabled = false;
          return;
        }

        const payload = { items: [{ name, url, iconClass, order, isStatus }] };
        try {
          const r = await fetch("/api/socials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const d = await r.json();
          if (d.success) {
            showToast("Item created");
            // Refresh the list
            const items = await fetchItems();
            render(items);
            initSortable();
          } else {
            showToast("Create failed", true);
          }
        } catch (err) {
          showToast("Create failed", true);
        } finally {
          btn.disabled = false;
        }
        return;
      }

      // Handle cancel create
      if (ev.target.closest(".cancel-create")) {
        const tr = ev.target.closest("tr");
        tr.style.display = "none";
        // Reset form
        tr.querySelectorAll('input[type="text"]').forEach(
          (inp) => (inp.value = "")
        );
        // Reset iconClass
        const iconClassInput = tr.querySelector('input[name="iconClass"]');
        if (iconClassInput) iconClassInput.value = "";
        const iconPreview = tr.querySelector(".icon-preview i");
        if (iconPreview) iconPreview.className = "fas fa-plus";
        const statusBtn = tr.querySelector(".btn-status");
        const statusInput = tr.querySelector('input[name="isStatus[]"]');
        if (statusBtn && statusInput) {
          statusBtn.className = "btn-status active";
          statusBtn.querySelector(".status-text").textContent = "SHOW";
          statusInput.value = "true";
        }
        return;
      }

      const btn = ev.target.closest && ev.target.closest(".save-row");
      if (!btn) return;
      const tr = btn.closest("tr");
      if (!tr) return;
      const id = tr.dataset.id;
      btn.disabled = true;
      const name = tr.querySelector('input[name="name[]"]').value.trim();
      const url = tr.querySelector('input[name="url[]"]').value.trim();
      const iconClass =
        tr.querySelector('input[name="iconClass"]')?.value || "";
      const order =
        parseInt(tr.querySelector('input[name="order[]"]').value, 10) || 0;
      const badge = tr.querySelector(".badge-minimal");
      const isStatus = badge ? badge.classList.contains("badge-active") : true;
      const payload = {
        items: [{ _id: id, name, url, iconClass, order, isStatus }],
      };
      try {
        const r = await fetch("/api/socials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (d.success) {
          showToast("Saved");
          // update badge display
          const badge = tr.querySelector(".badge-minimal");
          if (badge) {
            if (isStatus) {
              badge.classList.add("badge-active");
              badge.textContent = "SHOW";
            } else {
              badge.classList.remove("badge-active");
              badge.textContent = "HIDE";
            }
          }
        } else {
          showToast("Save failed", true);
        }
      } catch (err) {
        showToast("Save failed", true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // init
  const items = await fetchItems();
  render(items);
  initSortable();

  // Preload social icons for picker
  loadSocialIcons();

  // focus the inline row for editing, fallback to edit page
  window.openEditModal = function (id, btn) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
      const nameInput = row.querySelector('input[name="name[]"]');
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
        nameInput.classList.add("highlight-edit");
        setTimeout(() => nameInput.classList.remove("highlight-edit"), 1400);
      }
    } else {
      location.href = "/dashboard/socials/create?editId=" + id;
    }
  };

  // Global function to toggle social status
  window.toggleSocialStatus = async function (id, btn) {
    try {
      btn.disabled = true;
      const r = await fetch(`/api/socials/${id}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.success) {
        // Update badge display in this row
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
        showToast("Toggle failed", true);
      }
    } catch (err) {
      showToast("Toggle failed", true);
    } finally {
      btn.disabled = false;
    }
  };

  // Global function to toggle inline status (for create row)
  window.toggleInlineStatus = function (btn) {
    const tr = btn.closest("tr");
    const badge = tr.querySelector(".badge-minimal");
    const hiddenInput = tr.querySelector('input[name="isStatus[]"]');
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

  // Global function to soft delete social item
  window.deleteSocial = async function (id, btn) {
    if (!confirm("Are you sure you want to delete this social item?")) {
      return;
    }
    try {
      btn.disabled = true;
      const r = await fetch(`/api/socials/${id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.success) {
        // Refresh list to remove deleted item
        const items = await fetchItems();
        render(items);
        initSortable();
        showToast("Item deleted");
      } else {
        showToast("Delete failed", true);
      }
    } catch (err) {
      showToast("Delete failed", true);
    } finally {
      btn.disabled = false;
    }
  };

  // Icon Picker functionality
  let socialIcons = [];
  let currentIconTarget = null;

  // Load social icons from CDN
  async function loadSocialIcons() {
    try {
      const response = await fetch("/data/social-icons.json");
      if (!response.ok) throw new Error("Failed to load icons");
      socialIcons = await response.json();
    } catch (error) {
      console.error("Error loading social icons:", error);
      // Fallback to minimal set if CDN fails
      socialIcons = [
        { class: "fab fa-facebook-f", name: "Facebook" },
        { class: "fab fa-twitter", name: "Twitter" },
        { class: "fab fa-instagram", name: "Instagram" },
        { class: "fab fa-linkedin-in", name: "LinkedIn" },
        { class: "fab fa-youtube", name: "YouTube" },
      ];
    }
  }

  // Open icon picker
  window.openIconPicker = async function (element, rowElement) {
    currentIconTarget = { element, rowElement };
    const modal = document.getElementById("icon-picker-modal");
    modal.style.display = "flex";

    // Load icons if not already loaded
    if (socialIcons.length === 0) {
      await loadSocialIcons();
    }

    renderIconGrid(socialIcons);

    // Focus search input
    setTimeout(() => {
      document.getElementById("icon-search").focus();
    }, 100);
  };

  // Close icon picker
  window.closeIconPicker = function () {
    const modal = document.getElementById("icon-picker-modal");
    modal.style.display = "none";
    currentIconTarget = null;
    document.getElementById("icon-search").value = "";
  };

  // Render icon grid
  function renderIconGrid(icons) {
    const grid = document.getElementById("icon-picker-grid");
    grid.innerHTML = icons
      .map(
        (icon) => `
      <div class="icon-picker-item" onclick="selectIcon('${icon.class}')">
        <i class="${icon.class}"></i>
        <span>${icon.name}</span>
      </div>
    `
      )
      .join("");
  }

  // Handle icon search
  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("icon-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          renderIconGrid(socialIcons);
        } else {
          const filtered = socialIcons.filter(
            (icon) =>
              icon.name.toLowerCase().includes(query) ||
              icon.class.toLowerCase().includes(query)
          );
          renderIconGrid(filtered);
        }
      });
    }

    // Close modal when clicking overlay
    const modal = document.getElementById("icon-picker-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeIconPicker();
        }
      });
    }
  });

  // Select icon and update row
  window.selectIcon = function (iconClass) {
    if (!currentIconTarget) return;

    const { element, rowElement } = currentIconTarget;

    // Update the icon preview
    const iconElement = element.querySelector("i");
    if (iconElement) {
      iconElement.className = iconClass;
    }

    // Update the hidden iconClass input
    let iconInput = rowElement.querySelector('input[name="iconClass"]');
    if (!iconInput) {
      iconInput = document.createElement("input");
      iconInput.type = "hidden";
      iconInput.name = "iconClass";
      rowElement.appendChild(iconInput);
    }
    iconInput.value = iconClass;

    closeIconPicker();
    showToast("Icon selected - click Save to apply");
  };
})();
