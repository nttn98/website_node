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
    let html = `<table class="table-clean"><thead><tr><th width="15%">Form Type</th><th width="30%">Data Preview</th><th width="15%">Contact</th><th width="10%" class="text-center">Status</th><th width="10%" class="text-center">Date</th><th width="20%" class="text-end">Actions</th></tr></thead><tbody>`;
    if (items && items.length) {
      items.forEach((it) => {
        const dataPreview = Object.entries(it.data || {})
          .slice(0, 2)
          .map(([k, v]) => {
            let display = "";
            if (v && typeof v === "object" && v.id !== undefined) {
              display = v.name || v.id;
            } else display = String(v || "").substring(0, 30);
            return `<div class="small text-muted">${escapeHtml(
              k
            )}: <span class="text-dark">${escapeHtml(display)}</span></div>`;
          })
          .join("");
        const contact = `<div class="small">${
          it.email ? `<div>📧 ${escapeHtml(it.email)}</div>` : ""
        }${it.phone ? `<div>📱 ${escapeHtml(it.phone)}</div>` : ""}</div>`;
        const date = new Date(
          it.createdAt || it.submittedAt
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        html += `<tr data-id="${it._id}">
          <td><span class="badge-minimal ${
            it.isHandled ? "" : "badge-active"
          }">${escapeHtml(it.formType || "Form")}</span></td>
          <td>${dataPreview || '<span class="text-muted">No data</span>'}</td>
          <td>${contact || '<span class="text-muted">—</span>'}</td>
          <td class="text-center"><span class="status-dot ${
            it.isHandled ? "dot-active" : "dot-hidden"
          }"></span></td>
          <td class="text-center small text-muted">${date}</td>
          <td class="text-end">
            <button class="action-circle btn-view" data-id="${
              it._id
            }" title="View Details">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            </button>
            <button class="action-circle btn-toggle" data-id="${
              it._id
            }" title="${
          it.isHandled ? "Mark as unhandled" : "Mark as handled"
        }">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
            <button class="action-circle btn-del btn-delete" data-id="${
              it._id
            }" title="Delete">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </td>
        </tr>`;
      });
    } else {
      html += `<tr><td colspan="6" class="text-center p-5 text-muted">No submissions yet</td></tr>`;
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
        return `<div class="submission-detail-row">
          <div class="submission-detail-label">${escapeHtml(k)}</div>
          <div class="submission-detail-value">${escapeHtml(display)}</div>
        </div>`;
      });
      const date = new Date(it.createdAt || it.submittedAt).toLocaleString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
      const html = `
        <div class="custom-form-modal">
          <div class="custom-form-backdrop"></div>
          <div class="custom-form-dialog submission-detail-dialog" style="max-width: 600px;">
            <button class="custom-form-close">&times;</button>
            <h4 class="custom-form-title" style="text-align: center; font-size: 20px; margin-bottom: 20px;">Submission Details</h4>
            <div class="submission-detail-content">
              <div class="submission-detail-row">
                <div class="submission-detail-label">Form Type</div>
                <div class="submission-detail-value">${escapeHtml(
                  it.formType || "Form"
                )}</div>
              </div>
              <div class="submission-detail-row">
                <div class="submission-detail-label">Date Submitted</div>
                <div class="submission-detail-value">${date}</div>
              </div>
              ${
                it.email
                  ? `<div class="submission-detail-row">
                      <div class="submission-detail-label">Email</div>
                      <div class="submission-detail-value">${escapeHtml(
                        it.email
                      )}</div>
                    </div>`
                  : ""
              }
              ${
                it.phone
                  ? `<div class="submission-detail-row">
                      <div class="submission-detail-label">Phone</div>
                      <div class="submission-detail-value">${escapeHtml(
                        it.phone
                      )}</div>
                    </div>`
                  : ""
              }
              <hr style="margin: 16px 0; border: none; border-top: 1px solid #e9ecef;" />
              <h6 style="font-size: 12px; font-weight: 700; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Form Data</h6>
              ${rows.join("")}
            </div>
            <div class="form-actions">
              <button class="btn-ui-main close-detail">Close</button>
            </div>
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
