const Menu = require("../models/Menu");

/* ===== DASHBOARD ===== */

exports.getAllMenus = () => {
  return Menu.find({ isActive: true }).sort({ order: 1 }).lean();
};

exports.getMenuById = (id) => {
  return Menu.findById(id).lean();
};

exports.createMenu = (data) => {
  return Menu.create({
    title: new Map([
      ["en", data.title],
      ["vi", data.title],
      ["zh", data.title],
    ]),
    route: data.route || null,
    parent: data.parent || null,
    order: Number(data.order) || 0,
    type: data.type || "top",
    isButton: data.isButton === "on",
    isStatus: true,
    isActive: true,
  });
};

exports.updateMenu = (id, data) => {
  const update = {
    route: data.route || null,
    parent: data.parent || null,
    order: Number(data.order) || 0,
    type: data.type,
    isButton: data.isButton === "on",
  };

  if (data.title) {
    update["title.en"] = data.title;
  }

  return Menu.findByIdAndUpdate(id, update);
};

exports.deleteMenu = async (id) => {
  return Menu.findByIdAndUpdate(id, {
    isActive: false,
    isStatus: false,
  });
};

exports.toggleMenu = async (id) => {
  const menu = await Menu.findById(id);
  menu.isStatus = !menu.isStatus;
  await menu.save();
  return menu;
};
