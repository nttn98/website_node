const Form = require("../models/Form");
const Group = require("../../group/models/Group");

exports.getAllForms = () => {
  return Form.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

exports.getFormById = (id) => {
  return Form.findById(id).lean();
};

exports.getFormDocById = (id) => {
  return Form.findById(id);
};

exports.createForm = async (data) => {
  let parentName = null;
  let parentRoute = null;
  if (data.parentId) {
    const g = await Group.findById(data.parentId).lean();
    parentName = g ? g.title?.en || null : null;
  }
  const Form = await Form.create({
    title: {
      en: data.title_en || data.title || "",
      vi: data.title_vi || "",
      zh: data.title_zh || "",
    },
    parentId: data.parentId || null,
    parentRoute,
    parentName,
    route: data.route || null,
    isStatus: true,
    isActive: true,
  });
  return Form.toObject ? Form.toObject() : Form;
};

exports.updateForm = async (id, data) => {
  let parentName = null;
  if (data.parentId) {
    const g = await Group.findById(data.parentId).lean();
    parentName = g ? g.title?.en || null : null;
  }
  const update = {
    parentId: data.parentId || null,
    parentName,
    route: data.route || null,
    isStatus: data.isStatus === "on" || data.isStatus === true,
  };
  if (data.title_en) update["title.en"] = data.title_en;
  if (data.title_vi) update["title.vi"] = data.title_vi;
  if (data.title_zh) update["title.zh"] = data.title_zh;

  await Form.findByIdAndUpdate(id, update);
  return Form.findById(id).lean();
};

exports.deleteForm = async (id) => {
  await Form.findByIdAndUpdate(id, { isActive: false, isStatus: false });
  return { success: true };
};

exports.toggleStatus = async (id) => {
  const b = await Form.findById(id);
  if (!b) return null;
  b.isStatus = !b.isStatus;
  await b.save();
  return b;
};
