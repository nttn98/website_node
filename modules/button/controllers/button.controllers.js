const buttonService = require("../services/button.services");
const groupService = require("../../group/services/group.services");
const formService = require("../../form/services/form.services");

exports.index = async (req, res) => {
  const buttons = await buttonService.getAllButtons();
  res.json({ buttons });
};

exports.createForm = async (req, res) => {
  const groups = await groupService.getAllGroupsSorted();
  const forms = await formService.getAllForms();
  res.locals.groups = groups;
  res.locals.forms = forms;
  res.render("dashboard/buttons/create");
};

exports.create = async (req, res) => {
  try {
    const { title_en, title } = req.body || {};
    const finalTitle = (title_en || title || "").trim();
    if (!finalTitle)
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    const created = await buttonService.createButton(req.body);
    res.status(201).json({ success: true, button: created });
  } catch (err) {
    console.error("Failed to create button", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.editForm = async (req, res) => {
  const button = await buttonService.getButtonById(req.params.id);
  const groups = await groupService.getAllGroupsSorted();
  const forms = await formService.getAllForms();
  res.locals.groups = groups;
  res.locals.forms = forms;
  res.render("dashboard/buttons/edit", { button });
};

exports.update = async (req, res) => {
  try {
    const { title_en, title } = req.body || {};
    const finalTitle = (title_en || title || "").trim();
    if (!finalTitle)
      return res
        .status(400)
        .json({ success: false, message: "Title (EN) is required" });
    const updated = await buttonService.updateButton(req.params.id, req.body);
    res.json({ success: true, button: updated });
  } catch (err) {
    console.error("Failed to update button", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

exports.delete = async (req, res) => {
  await buttonService.deleteButton(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  const b = await buttonService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: b ? b.isStatus : false });
};
