(async function () {
  const tbody = document.getElementById("form-list-body");
  if (!tbody) return;

  let groupsCache = [];

  function escHtml(s) {
    if (!s && s !== 0) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render(items) {
    if (!items || !items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center p-5 text-muted">No forms yet. Click "ADD FORM" to create your first one.</td>
        </tr>`;
      return;
    }

    let rows = "";
    items.forEach((it) => {
      const title = (it.title && it.title.en) || it.title;
      const subTitle = (it.subTitle && it.subTitle.en) || it.subTitle || "-";
      const fieldsCount = (it.fields && it.fields.length) || 0;
      const preview =
        (it.fields || [])
          .map((f) => (f && f.placeholder ? f.placeholder : ""))
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || "";

      rows += `
      <tr>
        <td>
          <div class="fw-bold">${escHtml(title)}</div>
          <div class="small text-muted">${escHtml(subTitle)}</div>
        </td>
        <td>${fieldsCount}</td>
        <td>${escHtml(it.route || "")}</td>
        <td class="text-center"><span class="badge-minimal ${
          it.isStatus ? "badge-active" : ""
        }">${it.isStatus ? "SHOW" : "HIDE"}</span></td>
        <td class="text-end">
         <button class="action-circle btn-preview" data-id="${
           it._id
         }" title="Preview">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>

          <button class="action-circle btn-toggle" data-id="${
            it._id
          }" title="Toggle status">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </button>
         
          <a href="/dashboard/forms/${
            it._id
          }/edit" class="action-circle btn-edit" title="Edit">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </a>
        
          <button class="action-circle btn-delete" data-id="${
            it._id
          }" title="Delete">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>

        </td>
      </tr>`;
    });

    tbody.innerHTML = rows;
  }

  async function fetchItems() {
    const r = await fetch("/forms");
    const d = await r.json();
    return (d && d.forms) || [];
  }

  async function fetchGroups() {
    // parent groups no longer needed for forms
    return [];
  }

  async function init() {
    groupsCache = await fetchGroups();
    const items = await fetchItems();
    render(items);
    attachListeners();
  }

  function attachListeners() {
    document.addEventListener("click", async (ev) => {
      // Create
      if (ev.target.closest(".create-item")) {
        const btn = ev.target.closest(".create-item");
        btn.disabled = true;
        const tr = btn.closest("tr");
        const title_en = tr.querySelector('[name="title_en"]').value.trim();
        const solution = tr.querySelector('[name="solution"]').value.trim();
        const route = tr.querySelector('[name="route"]').value.trim();

        if (!title_en) {
          showToast("Title (EN) is required", true);
          btn.disabled = false;
          return;
        }

        const payload = { title_en, solution, route, isStatus: true };
        try {
          const r = await fetch("/forms/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const d = await r.json();
          if (d.success) {
            showToast("Created");
            const items = await fetchItems();
            render(items);
          } else showToast(d.message || "Create failed", true);
        } catch (err) {
          showToast("Create failed", true);
        } finally {
          btn.disabled = false;
        }
        return;
      }

      // Cancel create
      if (ev.target.closest(".cancel-create")) {
        const tr = ev.target.closest("tr");
        tr.style.display = "none";
        return;
      }

      // Delete
      if (ev.target.closest(".btn-delete")) {
        const id = ev.target.closest(".btn-delete").dataset.id;
        if (!confirm("Delete this form?")) return;
        try {
          const r = await fetch(`/forms/${id}`, { method: "DELETE" });
          const d = await r.json();
          if (d.success) {
            showToast("Deleted");
            const items = await fetchItems();
            render(items);
          } else showToast("Delete failed", true);
        } catch (err) {
          showToast("Delete failed", true);
        }
        return;
      }

      // Toggle status
      if (ev.target.closest(".btn-toggle")) {
        const id = ev.target.closest(".btn-toggle").dataset.id;
        const btn = ev.target.closest(".btn-toggle");
        btn.disabled = true;
        try {
          const r = await fetch(`/forms/${id}/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const d = await r.json();
          if (d.success) {
            showToast("Status updated");
            const items = await fetchItems();
            render(items);
          } else showToast("Toggle failed", true);
        } catch (err) {
          showToast("Toggle failed", true);
        } finally {
          btn.disabled = false;
        }
        return;
      }

      // Preview -> open modal
      if (ev.target.closest(".btn-preview")) {
        const id = ev.target.closest(".btn-preview").dataset.id;
        window.openFormModal(id);
        return;
      }

      // Edit -> redirect to edit page (anchor handles it), but support old button selectors
      if (ev.target.closest(".btn-edit") && !ev.target.closest("a")) {
        const id = ev.target.closest(".btn-edit").dataset.id;
        location.href = "/dashboard/forms/" + id + "/edit";
        return;
      }
    });
  }

  // init
  init();
})();
