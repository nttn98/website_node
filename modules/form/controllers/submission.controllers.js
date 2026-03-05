const submissionService = require("../services/submission.services");

exports.submit = async (req, res) => {
  try {
    const payload = {
      formId: req.body.formId || null,
      formType: req.body.formType || req.body.route || "quote",
      data: req.body.data || req.body,
      ip: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.get("User-Agent") || null,
    };

    // If formId provided or fields supplied (preview), remap submitted data to the form's field names
    if (payload.formId || Array.isArray(payload.fields)) {
      try {
        const formService = require("../services/form.services");
        let fields = [];
        if (payload.formId) {
          const form = await formService.getFormById(payload.formId);
          fields = form && Array.isArray(form.fields) ? form.fields : [];
        } else if (Array.isArray(payload.fields)) {
          fields = payload.fields;
        }

        if (fields && Array.isArray(fields) && fields.length) {
          const raw = payload.data || {};
          const mapped = {};
          for (const f of fields) {
            const fname =
              f.name || (f.label || "").toLowerCase().replace(/\s+/g, "_");
            const rawVal = raw[fname];

            // If value missing, store empty string
            if (rawVal === undefined) {
              mapped[fname] = "";
              continue;
            }

            try {
              // menuChildren => store { id, name }
              if (f.type === "menuChildren" && rawVal) {
                let name = "";
                try {
                  const menuService = require("../../menu/services/menu.services");
                  const menu = await menuService.getMenuById(rawVal);
                  name = menu ? menu.title?.en || menu.title || "" : "";
                } catch (e) {}
                mapped[fname] = { id: rawVal, name };
                continue;
              }

              // static select => store { id, name } if options exist
              if (
                f.type === "select" &&
                Array.isArray(f.options) &&
                f.options.length
              ) {
                const opt = f.options.find(
                  (o) => String(o.value) === String(rawVal)
                );
                const name = opt ? opt.label || opt.value : rawVal;
                mapped[fname] = { id: rawVal, name };
                continue;
              }

              // default: store raw value
              mapped[fname] = rawVal;
            } catch (errField) {
              mapped[fname] = rawVal;
            }
          }

          // Preserve extra keys that don't match fields
          Object.keys(raw).forEach((k) => {
            if (mapped[k] === undefined) mapped[k] = raw[k];
          });

          payload.data = mapped;
        }
      } catch (e) {
        // Non-fatal, fallback to raw payload
        console.error("Failed to normalize submission data", e);
      }
    }

    const created = await submissionService.createSubmission(payload);
    res.json({ success: true, submission: created });
  } catch (err) {
    console.error("Failed to create submission", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.index = async (req, res) => {
  try {
    const submissions = await submissionService.getAllSubmissions();
    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Failed to get submissions", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.toggleHandled = async (req, res) => {
  try {
    const s = await submissionService.toggleHandled(req.params.id);
    res.json({ success: true, isHandled: s ? s.isHandled : false });
  } catch (err) {
    console.error("Failed to toggle handled", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.delete = async (req, res) => {
  try {
    await submissionService.deleteSubmission(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete submission", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};
