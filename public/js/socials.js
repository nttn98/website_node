document.addEventListener("DOMContentLoaded", function () {
  const rows = document.getElementById("socials-rows");
  const addBtn = document.getElementById("add-row");

  function updateOrderInputs() {
    Array.from(rows.children).forEach((tr, i) => {
      const orderInput = tr.querySelector('[name="order[]"]');
      if (orderInput) orderInput.value = i;
    });
  }

  function createRow(item = {}) {
    const tr = document.createElement("tr");
    tr.setAttribute("draggable", "true");
    tr.className = item.isActive === false ? "removed" : "";
    tr.innerHTML = `
      <input type="hidden" name="id[]" value="${item._id || ""}">
      <td class="handle">☰</td>
      <td><input type="text" name="name[]" class="form-control-minimal" value="${
        item.name || ""
      }" readonly></td>
      <td><input type="text" name="iconClass[]" class="form-control-minimal" value="${
        item.iconClass || ""
      }" readonly></td>
      <td><input type="text" name="url[]" class="form-control-minimal" value="${
        item.url || ""
      }" readonly></td>
      <td><input type="number" name="order[]" class="form-control-minimal" value="${
        item.order || 0
      }" readonly></td>
      <td><input type="checkbox" name="isStatus[]" ${
        item.isStatus !== false ? "checked" : ""
      }></td>
      <td>
        <input type="hidden" name="isActive[]" value="${
          item.isActive !== false ? "true" : "false"
        }">
        <button type="button" class="btn-remove">${
          item.isActive === false ? "Restore" : "Remove"
        }</button>
      </td>
    `;

    // remove/restore toggle
    tr.querySelector(".btn-remove").addEventListener("click", () => {
      const hiddenActive = tr.querySelector('[name="isActive[]"]');
      const btn = tr.querySelector(".btn-remove");
      if (hiddenActive.value === "true") {
        hiddenActive.value = "false";
        tr.classList.add("removed");
        btn.textContent = "Restore";
      } else {
        hiddenActive.value = "true";
        tr.classList.remove("removed");
        btn.textContent = "Remove";
      }
    });

    // drag handlers
    tr.addEventListener("dragstart", (e) => tr.classList.add("dragging"));
    tr.addEventListener("dragend", (e) => {
      tr.classList.remove("dragging");
      updateOrderInputs();
    });

    rows.appendChild(tr);
    updateOrderInputs();
    return tr;
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll("tr:not(.dragging)"),
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  rows.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = getDragAfterElement(rows, e.clientY);
    const dragging = document.querySelector(".dragging");
    if (!dragging) return;
    if (!after) rows.appendChild(dragging);
    else rows.insertBefore(dragging, after);
  });

  // Attach drag handlers to rows that were present on load
  function attachDragHandlers() {
    Array.from(rows.querySelectorAll("tr")).forEach((tr) => {
      tr.setAttribute("draggable", "true");
      if (!tr._dragHandlersAttached) {
        tr.addEventListener("dragstart", () => tr.classList.add("dragging"));
        tr.addEventListener("dragend", () => {
          tr.classList.remove("dragging");
          updateOrderInputs();
        });
        tr._dragHandlersAttached = true;
      }
    });
  }

  attachDragHandlers();

  // initialize edit mode off
  setEditEnabled(false);

  // Edit mode toggle (readonly inputs by default)
  let editEnabled = false;
  const toggleBtn = document.getElementById("toggle-edit");
  function setEditEnabled(enabled) {
    editEnabled = !!enabled;
    // toggle readonly on inputs
    document
      .querySelectorAll(
        '#socials-rows [name="name[]"], #socials-rows [name="iconClass[]"], #socials-rows [name="url[]"], #socials-rows [name="order[]"]'
      )
      .forEach((i) => {
        if (editEnabled) i.removeAttribute("readonly");
        else i.setAttribute("readonly", "");
      });
    toggleBtn.textContent = editEnabled ? "Disable edit" : "Enable edit";
    // allow adding only when edit enabled
    if (editEnabled) addBtn.classList.remove("disabled");
    else addBtn.classList.add("disabled");
  }
  toggleBtn.addEventListener("click", () => setEditEnabled(!editEnabled));

  addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!editEnabled) {
      showToast("Editing enabled");
      setEditEnabled(true);
    }
    const r = createRow({});
    // attach handlers to new row
    r.addEventListener("dragstart", () => r.classList.add("dragging"));
    r.addEventListener("dragend", () => {
      r.classList.remove("dragging");
      updateOrderInputs();
    });
  });

  document
    .getElementById("socials-form")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      updateOrderInputs();
      // collect form arrays
      const form = e.target;
      const ids = Array.from(form.querySelectorAll('[name="id[]"]'))
        .map((i) => i.value.trim())
        .filter(Boolean);
      const names = Array.from(form.querySelectorAll('[name="name[]"]')).map(
        (i) => i.value.trim()
      );
      const iconClasses = Array.from(
        form.querySelectorAll('[name="iconClass[]"]')
      ).map((i) => i.value.trim());
      const urls = Array.from(form.querySelectorAll('[name="url[]"]')).map(
        (i) => i.value.trim()
      );
      const orders = Array.from(form.querySelectorAll('[name="order[]"]')).map(
        (i) => Number(i.value) || 0
      );
      const isStatuses = Array.from(
        form.querySelectorAll('[name="isStatus[]"]')
      ).map((i) => i.checked);
      const isActives = Array.from(
        form.querySelectorAll('[name="isActive[]"]')
      ).map((i) => i.value === "true");

      const items = names.map((n, idx) => ({
        _id: form.querySelectorAll('[name="id[]"]')[idx]
          ? form.querySelectorAll('[name="id[]"]')[idx].value || undefined
          : undefined,
        name: n,
        iconClass: iconClasses[idx] || "",
        url: urls[idx] || "",
        order: orders[idx] || 0,
        isStatus: isStatuses[idx] === true,
        isActive: isActives[idx] === true,
      }));

      try {
        const r = await fetch("/api/socials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const d = await r.json();
        if (d.success) {
          showToast("Saved");
          setTimeout(() => (location.href = "/dashboard/socials"), 400);
        } else showToast(d.message || "Save failed", true);
      } catch (err) {
        console.error(err);
        showToast("Save failed", true);
      }
    });

  // Toggle visible status for single item
  window.toggleSocialStatus = async function (id, btn) {
    try {
      btn.disabled = true;
      const r = await fetch("/api/socials/" + id + "/toggle-status", {
        method: "POST",
      });
      const d = await r.json();
      if (d.success) {
        const tr = btn.closest("tr");
        const badge = tr.querySelector(".badge-minimal");
        if (badge) {
          badge.textContent = d.isStatus ? "SHOW" : "HIDE";
          if (d.isStatus) badge.classList.add("badge-active");
          else badge.classList.remove("badge-active");
        }
      } else alert(d.message || "Failed");
    } catch (err) {
      console.error(err);
      alert("Failed");
    } finally {
      btn.disabled = false;
    }
  };

  // Confirm modal helper
  function showConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirm-modal");
      const msg = document.getElementById("confirm-modal-message");
      const ok = document.getElementById("confirm-ok");
      const cancel = document.getElementById("confirm-cancel");
      msg.textContent = message || "Are you sure?";
      modal.classList.remove("d-none");

      function cleanup() {
        modal.classList.add("d-none");
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
      }
      function onOk() {
        cleanup();
        resolve(true);
      }
      function onCancel() {
        cleanup();
        resolve(false);
      }
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
    });
  }

  // Soft-delete / restore a single item (no reload)
  window.deleteSocial = async function (id, btn) {
    try {
      const confirmed = await showConfirm("Remove this item?");
      if (!confirmed) return;
      btn.disabled = true;
      const r = await fetch("/api/socials/" + id + "/toggle-active", {
        method: "POST",
      });
      const d = await r.json();
      if (d.success) {
        // Update DOM: find row and toggle removed class, update hidden input and button icon/text
        const tr = btn.closest("tr");
        const hidden = tr.querySelector('[name="isActive[]"]');
        if (d.isActive === false) {
          tr.classList.add("removed");
          if (hidden) hidden.value = "false";
          btn.title = "Restore";
          btn.innerHTML =
            '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5c4.418 0 8 3.582 8 7s-3.582 7-8 7-8-3.582-8-7 3.582-7 8-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
          showToast("Removed");
        } else {
          tr.classList.remove("removed");
          if (hidden) hidden.value = "true";
          btn.title = "Remove";
          btn.innerHTML =
            '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
          showToast("Restored");
        }
      } else showToast(d.message || "Failed", true);
    } catch (err) {
      console.error(err);
      showToast("Failed", true);
    } finally {
      btn.disabled = false;
    }
  };

  // Focus first input in row for editing
  window.focusRow = function (btn) {
    const tr = btn.closest("tr");
    const input = tr.querySelector('[name="name[]"]');
    if (input) input.focus();
  };
});
