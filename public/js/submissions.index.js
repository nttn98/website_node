(async function () {
  const container = document.getElementById("submission-list");
  if (!container) return;

  function escapeHtml(s) {
    if (!s && s !== 0) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render(items) {
    let html = `<table class="table table-striped"><thead><tr><th>Type</th><th>Data</th><th>Email</th><th>Phone</th><th>Handled</th><th class="text-end">Actions</th></tr></thead><tbody>`;
    if (items && items.length) {
      items.forEach((it) => {
        const dataText = Object.entries(it.data || {})
          .map(([k, v]) => {
            let display = "";
            if (v && typeof v === "object" && v.id !== undefined) {
              display = `${v.name || v.id} (${v.id})`;
            } else display = String(v || "");
            return `${escapeHtml(k)}: ${escapeHtml(display)}`;
          })
          .join("<br/>");
        html += `<tr data-id="${it._id}"><td>${
          it.formType || ""
        }</td><td>${dataText}</td><td>${it.email || ""}</td><td>${
          it.phone || ""
        }</td><td>${
          it.isHandled ? "Yes" : "No"
        }</td><td class="text-end"><button class="btn btn-sm btn-outline-primary btn-view" data-id="${
          it._id
        }">View</button> <button class="btn btn-sm btn-outline-secondary btn-toggle" data-id="${
          it._id
        }">${
          it.isHandled ? "Unmark" : "Mark handled"
        }</button> <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${
          it._id
        }">Delete</button></td></tr>`;
      });
    } else {
      html += `<tr><td colspan="6" class="text-center p-4 text-muted">No submissions yet</td></tr>`;
    }
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  async function fetchItems() {
    try {
      const r = await fetch("/api/forms/submissions");
      const d = await r.json();
      if (d.success === false) {
        showToast(d.message || "Failed to load submissions", true);
        return [];
      }
      return (d && d.submissions) || [];
    } catch (err) {
      showToast("Failed to load submissions", true);
      return [];
    }
  }

  container.addEventListener("click", async (ev) => {
    // View details
    if (ev.target.closest(".btn-view")) {
      const id = ev.target.closest(".btn-view").dataset.id;
      const items = await fetchItems();
      const it = items.find((x) => x._id === id);
      if (!it) return showToast("Submission not found", true);
      // Build detail HTML
      const rows = Object.entries(it.data || {}).map(([k, v]) => {
        let display = "";
        if (v && typeof v === "object" && v.id !== undefined) {
          display = `${v.name || v.id} (${v.id})`;
        } else display = String(v || "");
        return `<div class="d-flex justify-content-between mb-2"><div class="text-muted small">${k}</div><div>${escapeHtml(
          display
        )}</div></div>`;
      });
      const html = `
        <div class="custom-form-modal">
          <div class="custom-form-backdrop"></div>
          <div class="custom-form-dialog">
            <button class="custom-form-close">&times;</button>
            <h5 class="mb-2">Submission</h5>
            <div class="mb-2"><strong>Form Type:</strong> ${escapeHtml(
              it.formType || ""
            )}</div>
            <div class="mb-2"><strong>Email:</strong> ${escapeHtml(
              it.email || ""
            )}</div>
            <div class="mb-2"><strong>Phone:</strong> ${escapeHtml(
              it.phone || ""
            )}</div>
            <div class="mb-3">${rows.join("")}</div>
            <div class="text-end"><button class="btn btn-sm btn-outline-secondary close-detail">Close</button></div>
          </div>
        </div>`;
      const modal = document.getElementById("submission-detail-modal");
      modal.innerHTML = html;
      modal.style.display = "";

      modal
        .querySelector(".custom-form-close")
        .addEventListener("click", () => (modal.style.display = "none"));
      modal
        .querySelector(".custom-form-backdrop")
        .addEventListener("click", () => (modal.style.display = "none"));
      modal
        .querySelector(".close-detail")
        .addEventListener("click", () => (modal.style.display = "none"));
      return;
    }

    if (ev.target.closest(".btn-toggle")) {
      const id = ev.target.closest(".btn-toggle").dataset.id;
      try {
        const r = await fetch(`/api/forms/submissions/${id}/toggle-handled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const d = await r.json();
        if (d.success) {
          showToast("Updated");
          const items = await fetchItems();
          render(items);
        } else showToast("Update failed", true);
      } catch (err) {
        showToast("Update failed", true);
      }
      return;
    }
    if (ev.target.closest(".btn-delete")) {
      const id = ev.target.closest(".btn-delete").dataset.id;
      if (!confirm("Delete this submission?")) return;
      try {
        const r = await fetch(`/api/forms/submissions/${id}/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
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
  });

  const items = await fetchItems();
  render(items);

  // Export CSV
  const exportBtn = document.getElementById("export-csv");
  exportBtn?.addEventListener("click", async () => {
    const items = await fetchItems();
    if (!items || !items.length)
      return showToast("No submissions to export", true);
    const rows = items.map((it) => {
      const dataObj = {};
      Object.entries(it.data || {}).forEach(([k, v]) => {
        if (v && typeof v === "object" && v.id !== undefined)
          dataObj[k] = `${v.name || v.id} (${v.id})`;
        else dataObj[k] = v;
      });
      return {
        id: it._id,
        formType: it.formType || "",
        email: it.email || "",
        phone: it.phone || "",
        isHandled: it.isHandled ? "Yes" : "No",
        ...dataObj,
      };
    });

    // build CSV header
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const csv = [keys.join(",")]
      .concat(
        rows.map((r) =>
          keys
            .map((k) => `"${String(r[k] || "").replace(/"/g, '""')}"`)
            .join(",")
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
})();
