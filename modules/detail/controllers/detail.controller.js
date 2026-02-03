const detailService = require("../services/detail.service");
const menuService = require("../../menu/services/menu.service");

/* ===== LIST ===== */
exports.index = async (req, res) => {
  const details = await detailService.getAllDetails();
  const menus = await menuService.getAllMenus();

  res.locals.menus = menus;
  res.locals.currentMenuId = null;

  res.render("dashboard/details/index", { details });
};

/* ===== CREATE ===== */
exports.createForm = async (req, res) => {
  const menus = await menuService.getAllMenus();

  res.locals.menus = menus;
  res.locals.currentMenuId = req.query.menuId || null;

  res.render("dashboard/details/create");
};

exports.create = async (req, res) => {
  await detailService.create(req.body);
  res.redirect(`/dashboard/details/${req.body.parentId}`);
};

/* ===== EDIT ===== */
exports.editForm = async (req, res) => {
  const detail = await detailService.getDetailById(req.params.id);
  const menus = await menuService.getAllMenus();

  res.locals.menus = menus;
  res.locals.currentMenuId = detail.parentId.toString();

  res.render("dashboard/details/edit", { detail, menus });
};

exports.update = async (req, res) => {
  await detailService.updateDetail(req.params.id, req.body);
  res.redirect("/dashboard/details");
};

/* ===== DELETE ===== */
exports.delete = async (req, res) => {
  await detailService.deleteDetail(req.params.id);
  res.json({ success: true });
};

exports.showDetailByMenu = async (req, res) => {
  const menuId = req.params.menuId;
  const menus = await menuService.getAllMenus();
  const detail = await detailService.getByMenu(menuId);

  res.locals.menus = menus;
  res.locals.currentMenuId = menuId;

  res.render("dashboard/details/show", {
    menuId,
    detail,
  });
};
