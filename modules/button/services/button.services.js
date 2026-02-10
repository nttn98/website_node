const Button = require("../models/Button");
const Group = require("../../group/models/Group");
const Form = require("../../form/models/Form");

exports.getAllButtons = () => {
  return Button.find({ isActive: true })
    .populate("parents", "title")
    .populate("form.id", "title")
    .sort({ createdAt: -1 })
    .lean();
};

exports.getButtonById = (id) => {
  return Button.findById(id)
    .populate("parents", "title")
    .populate("form.id", "title")
    .lean();
};

exports.getButtonDocById = (id) => {
  return Button.findById(id);
};

exports.createButton = async (data) => {
  const buttonType = data.type || "route";
  // prepare small form object when button links to a form
  let formObj = { id: null, shortName: "" };
  if (buttonType === "form" && data.formId) {
    try {
      const f = await Form.findById(data.formId).lean();
      formObj = {
        id: f ? f._id : data.formId,
        shortName: f ? f.shortName || "" : "",
      };
    } catch (err) {}
  }

  // Handle parents array
  let parents = [];
  if (data.parents && Array.isArray(data.parents)) {
    parents = data.parents.filter(Boolean);
  } else if (data.parentId) {
    // backward compatibility
    parents = [data.parentId];
  }

  const button = await Button.create({
    title: {
      en: data.title_en || data.title || "",
      vi: data.title_vi || "",
      zh: data.title_zh || "",
    },
    parents,
    route: buttonType === "form" ? null : data.route || null,
    type: buttonType,
    form: formObj,
    isStatus: true,
    isActive: true,
  });
  return button.toObject ? button.toObject() : button;
};

exports.updateButton = async (id, data) => {
  const buttonType = data.type || "route";

  // Handle parents array
  let parents = [];
  if (data.parents && Array.isArray(data.parents)) {
    parents = data.parents.filter(Boolean);
  } else if (data.parentId) {
    // backward compatibility
    parents = [data.parentId];
  }

  const update = {
    parents,
    route: buttonType === "form" ? null : data.route || null,
    type: buttonType,
  };
  // populate form object for quick access
  if (buttonType === "form" && data.formId) {
    try {
      const f = await Form.findById(data.formId).lean();
      update.form = {
        id: f ? f._id : data.formId,
        shortName: f ? f.shortName || "" : "",
      };
    } catch (err) {
      update.form = { id: data.formId || null, shortName: "" };
    }
  } else {
    update.form = { id: null, shortName: "" };
  }
  if (data.title_en) update["title.en"] = data.title_en;
  if (data.title_vi) update["title.vi"] = data.title_vi;
  if (data.title_zh) update["title.zh"] = data.title_zh;

  await Button.findByIdAndUpdate(id, update);
  return Button.findById(id)
    .populate("parents", "title")
    .populate("form.id", "title")
    .lean();
};

exports.deleteButton = async (id) => {
  await Button.findByIdAndUpdate(id, { isActive: false, isStatus: false });
  return { success: true };
};

exports.toggleStatus = async (id) => {
  const b = await Button.findById(id);
  if (!b) return null;
  b.isStatus = !b.isStatus;
  await b.save();
  return b;
};
