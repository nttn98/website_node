const formService = require("../services/form.services");

exports.index = async (req, res) => {
  const forms = await formService.getAllforms();
  res.json({ forms });
};

exports.createForm = async (req, res) => {
  const groups = await groupService.getAllGroupsSorted();
  res.locals.groups = groups;
  res.render("dashboard/forms/create");
};

exports.create = async (req, res) => {
  try {
    const { title_en, title } = req.body || {};
    const finalTitle = (title_en || title || "").trim();
    if (!finalTitle)
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    const created = await formService.createform(req.body);
    res.status(201).json({ success: true, form: created });
  } catch (err) {
    console.error("Failed to create form", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.editForm = async (req, res) => {
  const form = await formService.getformById(req.params.id);
  const groups = await groupService.getAllGroupsSorted();
  res.locals.groups = groups;
  res.render("dashboard/forms/edit", { form });
};

exports.update = async (req, res) => {
  try {
    const { title_en, title } = req.body || {};
    const finalTitle = (title_en || title || "").trim();
    if (!finalTitle)
      return res
        .status(400)
        .json({ success: false, message: "Title (EN) is required" });
    const updated = await formService.updateform(req.params.id, req.body);
    res.json({ success: true, form: updated });
  } catch (err) {
    console.error("Failed to update form", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.delete = async (req, res) => {
  await formService.deleteform(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  const b = await formService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: b ? b.isStatus : false });
};
