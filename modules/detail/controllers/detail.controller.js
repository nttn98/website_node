exports.toggleStatus = async (req, res) => {
  await detailService.toggleStatus(req.params.id);
  res.redirect("back");
};
const detailService = require("../services/detail.service");
const menuService = require("../../menu/services/menu.service");

/* ===== LIST ===== */
exports.index = async (req, res) => {
  const menus = await menuService.getAllMenus();
  const menuId = req.query.menuId || menus[0]?._id;
  // Lấy tất cả detail của menu đang chọn
  const details = menuId ? await detailService.getDetailsByMenu(menuId) : [];

  res.locals.menus = menus;
  res.locals.currentMenuId = menuId ? menuId.toString() : null;

  res.render("dashboard/details/index", {
    menuId,
    details,
  });
};

/* ===== CREATE ===== */
exports.createForm = async (req, res) => {
  const menus = await menuService.getAllMenus();
  res.locals.menus = menus;
  res.locals.currentMenuId = req.query.menuId || null;
  res.render("dashboard/details/create");
};

exports.create = async (req, res) => {
  // Lấy parentName từ menu
  const menu = await menuService.getMenuById(req.body.parentId);
  req.body.parentName = menu?.title?.en || "";
  await detailService.create(req.body);
  res.redirect(`/details?menuId=${req.body.parentId}`);
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
  // Đảm bảo luôn truyền parentId khi update
  if (!req.body.parentId) {
    const detail = await detailService.getDetailById(req.params.id);
    req.body.parentId = detail.parentId;
  }
  await detailService.updateDetail(req.params.id, req.body);
  res.redirect(`/details?menuId=${req.body.parentId}`);
};

/* ===== DELETE ===== */
exports.delete = async (req, res) => {
  await detailService.deleteDetail(req.params.id);
  res.json({ success: true });
};

exports.showDetailByMenu = async (req, res) => {
  const menuId = req.params.menuId;
  const menus = await menuService.getAllMenus();
  const details = await detailService.getDetailsByMenu(menuId);

  res.locals.menus = menus;
  res.locals.currentMenuId = menuId;

  res.render("dashboard/details/index", {
    menuId,
    details,
  });
};
