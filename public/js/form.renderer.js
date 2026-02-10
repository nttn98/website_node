// Simple form modal renderer and submit helper
window.openFormModal = async function (formOrId, opts = {}) {
  if (!formOrId) return;
  try {
    let form = null;
    if (typeof formOrId === "string") {
      const res = await fetch("/forms/" + formOrId);
      const data = await res.json();
      if (!data || !data.form) return console.error("Form not found");
      form = data.form;
    } else if (typeof formOrId === "object") {
      form = formOrId;
    } else return; // invalid input

    // Build modal
    const modal = document.createElement("div");
    modal.className = "custom-form-modal";
    modal.innerHTML = `
      <div class="custom-form-backdrop"></div>
      <div class="custom-form-dialog">
        <button class="custom-form-close">&times;</button>
        <h3 class="custom-form-title">${
          (form.title && form.title.en) || ""
        }</h3>
        <p class="custom-form-subtitle">${
          (form.subTitle && form.subTitle.en) || ""
        }</p>
        <form class="custom-form-body"></form>
      </div>
    `;
    document.body.appendChild(modal);
    const formEl = modal.querySelector(".custom-form-body");

    // Helper to create field HTML
    async function renderField(f) {
      const wrapper = document.createElement("div");
      wrapper.className = "form-field";
      const label = document.createElement("label");
      label.textContent = "";
      wrapper.appendChild(label);
      let input;
      if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.placeholder = f.placeholder || "";
      } else if (f.type === "select") {
        input = document.createElement("select");
        // Add placeholder option
        const placeholderOpt = document.createElement("option");
        placeholderOpt.value = "";
        placeholderOpt.textContent = f.placeholder || "Select an option";
        placeholderOpt.disabled = true;
        placeholderOpt.selected = true;
        input.appendChild(placeholderOpt);
        const opts = f.options || [];
        opts.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value || o.label || "";
          opt.textContent = o.label || o.value || "";
          input.appendChild(opt);
        });
      } else if (f.type === "menuChildren") {
        input = document.createElement("select");
        const menuId = f.optionsSource && f.optionsSource.menuId;
        const placeholderOpt = document.createElement("option");
        placeholderOpt.value = "";
        placeholderOpt.textContent = "Loading...";
        input.appendChild(placeholderOpt);
        if (menuId) {
          try {
            const r = await fetch("/api/menus/" + menuId + "/children");
            const d = await r.json();
            input.innerHTML = "";
            const children = (d && d.data) || d || [];
            const ph = document.createElement("option");
            ph.value = "";
            ph.textContent = f.placeholder || "Select an option";
            ph.disabled = true;
            ph.selected = true;
            input.appendChild(ph);
            children.forEach((child) => {
              const opt = document.createElement("option");
              opt.value = child._id;
              opt.textContent =
                (child.title && child.title.en) || child.title || "";
              input.appendChild(opt);
            });
          } catch (err) {
            input.innerHTML = "";
            const ph = document.createElement("option");
            ph.value = "";
            ph.textContent = "Unable to load";
            input.appendChild(ph);
          }
        }
      } else {
        input = document.createElement("input");
        // Set appropriate input type based on field type
        if (f.type === "email") {
          input.type = "email";
        } else if (f.type === "phone") {
          input.type = "tel";
          // Restrict phone input to numbers and common formatting characters
          input.addEventListener("input", function (e) {
            const value = e.target.value;
            // Allow only numbers, +, -, (, ), and spaces
            const filtered = value.replace(/[^0-9+\-() ]/g, "");
            if (value !== filtered) {
              e.target.value = filtered;
            }
          });
          // Add pattern for validation
          input.pattern = "[0-9+\\-() ]+";
        } else {
          input.type = "text";
        }
        input.placeholder = f.placeholder || "";
      }

      if (f.required) input.required = true;
      input.name =
        f.name || (f.label || "field").toLowerCase().replace(/\s+/g, "_");
      wrapper.appendChild(input);
      formEl.appendChild(wrapper);
    }

    // Render fields sequentially (to allow async menu fetch)
    for (const f of form.fields || []) await renderField(f);

    // Submit button
    const submitRow = document.createElement("div");
    submitRow.className = "form-actions";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-ui-main";
    submit.textContent = opts.submitText || "Submit";
    submitRow.appendChild(submit);
    formEl.appendChild(submitRow);

    // Close handler
    modal
      .querySelector(".custom-form-close")
      .addEventListener("click", () => modal.remove());
    modal
      .querySelector(".custom-form-backdrop")
      .addEventListener("click", () => modal.remove());

    // Submit handler
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Validate required dropdown fields
      const selects = formEl.querySelectorAll("select[required]");
      for (const select of selects) {
        if (!select.value || select.value === "") {
          const fieldName = select.name || "field";
          showToast(`Please select a valid option for ${fieldName}`, true);
          select.style.borderColor = "#ef4444";
          select.focus();
          select.addEventListener(
            "change",
            function () {
              select.style.borderColor = "";
            },
            { once: true }
          );
          return;
        }
      }

      // Trigger HTML5 validation
      if (!formEl.checkValidity()) {
        formEl.reportValidity();
        return;
      }

      const fd = new FormData(formEl);
      const dataObj = {};
      for (const [k, v] of fd.entries()) dataObj[k] = v;
      try {
        // Include fields when previewing an unsaved form (no _id)
        const bodyPayload = { formId: form._id || null, data: dataObj };
        if (!form._id && Array.isArray(form.fields))
          bodyPayload.fields = form.fields;
        const r = await fetch("/api/forms/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
        const d = await r.json();
        if (d.success) {
          showToast(opts.successMessage || "Submitted successfully");
          modal.remove();
        } else showToast(d.message || "Submit failed", true);
      } catch (err) {
        console.error("Submit error", err);
        showToast("Submit failed", true);
      }
    });
  } catch (err) {
    console.error("Failed to open form", err);
  }
};

// Auto bind: any element with data-open-form="<formId>" will open the modal
document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-open-form]");
  if (!el) return;
  const fid = el.getAttribute("data-open-form");
  if (!fid) return;
  e.preventDefault();
  window.openFormModal(fid);
});
