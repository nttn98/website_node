const Menu = require("../models/Menu");

/* ===== DASHBOARD ===== */

exports.getAllMenus = () => {
  return Menu.find({ isActive: true }).sort({ order: 1 }).lean();
};

exports.getMenuById = (id) => {
  return Menu.findById(id).lean();
};

exports.createMenu = async (data) => {
  let parentName = null;
  if (data.parentId) {
    const parentMenu = await Menu.findById(data.parentId).lean();
    if (parentMenu)
      parentName = parentMenu.title?.en || parentMenu.title || null;
  }
  const menu = await Menu.create({
    title: new Map([
      ["en", data.title_en || data.title || ""],
      ["vi", data.title_vi || data.title || ""],
      ["zh", data.title_zh || data.title || ""],
    ]),
    route: data.route || null,
    parentId: data.parentId || null,
    parentName,
    order: Number(data.order) || 0,
    type: data.type || "top",
    isButton: data.isButton === "on",
    isStatus: true,
    isActive: true,
  });
  return menu.toObject();
};

exports.updateMenu = async (id, data) => {
  let parentName = null;
  if (data.parentId) {
    const parentMenu = await Menu.findById(data.parentId).lean();
    if (parentMenu)
      parentName = parentMenu.title?.en || parentMenu.title || null;
  }
  const update = {
    route: data.route || null,
    parentId: data.parentId || null,
    parentName,
    order: Number(data.order) || 0,
    type: data.type,
    isButton: data.isButton === "on",
  };

  // Multi-language title support
  if (data.title_en) update["title.en"] = data.title_en;
  if (data.title_vi) update["title.vi"] = data.title_vi;
  if (data.title_zh) update["title.zh"] = data.title_zh;

  await Menu.findByIdAndUpdate(id, update);
  return Menu.findById(id).lean();
};

exports.deleteMenu = async (id) => {
  await Menu.findByIdAndUpdate(id, {
    isActive: false,
    isStatus: false,
  });
  return { success: true };
};

exports.toggleMenu = async (id) => {
  const menu = await Menu.findById(id);
  menu.isStatus = !menu.isStatus;
  await menu.save();
  return { success: true, isStatus: menu.isStatus };
};
