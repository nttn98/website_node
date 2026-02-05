const Button = require("../models/Button");
const Group = require("../models/Group");

exports.getAllButton = () => {
  return Button.find({ isActive: true }).sort({ _id: 1 }).lean();
};

exports.getButtonById = (id) => {
  return Button.findById(id).lean();
};

exports.createButton = async (data) => {
  let parentName = null;
  if (data.prarentId) {
    const parentGroup = await Group.findById(data.prarentId).lean();
  }
};
