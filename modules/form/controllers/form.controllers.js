const formService = require("../services/form.services");
const groupService = require("../../group/services/group.services");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

exports.index = async (req, res) => {
  const params = getPaginationParams(req, { defaultLimit: 25, maxLimit: 300 });
  let forms = await formService.getAllForms();
  const searchTerm = (req.query.search || "").trim().toLowerCase();

  // Apply search filter if provided
  if (searchTerm) {
    forms = forms.filter(
      (form) =>
        (form.title?.en || "").toLowerCase().includes(searchTerm) ||
        (form.title?.vi || "").toLowerCase().includes(searchTerm) ||
        (form.route || "").toLowerCase().includes(searchTerm)
    );
  }

  // Resolve parentName for display (do not store it on form documents)
  const resolved = await Promise.all(
    (forms || []).map(async (f) => {
      if (f.parentId) {
        const g = await groupService.getGroupById(f.parentId);
        f.parentName = g ? g.title?.en || g.title || "" : "";
      } else {
        f.parentName = "";
      }
      return f;
    })
  );
  const paged = paginateArray(resolved, params);
  res.json({ forms: paged.items, pagination: paged.pagination });
};

exports.createForm = async (req, res) => {
  // Parent groups are no longer needed for new forms
  res.json({ groups: [] });
};

exports.create = async (req, res) => {
  try {
    const { title_en, title } = req.body || {};
    const finalTitle = (title_en || title || "").trim();
    if (!finalTitle)
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    const created = await formService.createForm(req.body);
    res.status(201).json({ success: true, form: created });
  } catch (err) {
    console.error("Failed to create form", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.editForm = async (req, res) => {
  const form = await formService.getFormById(req.params.id);
  // Parent groups are not required
  res.json({ form });
};

exports.update = async (req, res) => {
  try {
    const { title_en, title } = req.body || {};
    const finalTitle = (title_en || title || "").trim();
    if (!finalTitle)
      return res
        .status(400)
        .json({ success: false, message: "Title (EN) is required" });
    const updated = await formService.updateForm(req.params.id, req.body);
    res.json({ success: true, form: updated });
  } catch (err) {
    console.error("Failed to update form", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.delete = async (req, res) => {
  await formService.deleteForm(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  const b = await formService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: b ? b.isStatus : false });
};

// Public getter for form JSON
exports.getForm = async (req, res) => {
  const id = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const form = await formService.getFormById(id);
  if (!form)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, form });
};
