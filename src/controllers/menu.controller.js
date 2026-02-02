const menuService = require("../services/menu.service");

/* ===== LIST ===== */
exports.getAllMenus = async (req, res) => {
  const menus = await menuService.getAllMenus();

  res.locals.menus = menus;
  res.locals.currentMenuId = null;

  res.render("dashboard/menus/index", { menus });
};

/* ===== CREATE FORM ===== */
exports.createMenuForm = async (req, res) => {
  const menus = await menuService.getAllMenus();
  res.locals.menus = menus;

  res.render("dashboard/menus/create");
};

/* ===== EDIT FORM ===== */
exports.editMenuForm = async (req, res) => {
  const menus = await menuService.getAllMenus();
  const menu = await menuService.getMenuById(req.params.id);

  res.locals.menus = menus;
  res.locals.currentMenuId = menu._id.toString();

  res.render("dashboard/menus/edit", { menu });
};

/* ===== API ===== */
exports.createMenu = async (req, res) => {
  await menuService.createMenu(req.body);
  res.redirect("/dashboard/menus");
};

exports.updateMenu = async (req, res) => {
  await menuService.updateMenu(req.params.id, req.body);
  res.redirect("/dashboard/menus");
};

exports.deleteMenu = async (req, res) => {
  await menuService.deleteMenu(req.params.id);
  res.json({ success: true });
};

exports.toggleMenu = async (req, res) => {
  const menu = await menuService.toggleMenu(req.params.id);
  res.json({ success: true, isStatus: menu.isStatus });
};
