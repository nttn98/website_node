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

  let message = null;
  if (req.query.success && req.session && req.session.detailMessage) {
    message = req.session.detailMessage;
    delete req.session.detailMessage;
  }
  res.render("dashboard/details/index", {
    menuId,
    details,
    message,
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
  // Lấy parentName từ menu (for filename)
  const menu = await menuService.getMenuById(req.body.parentId);
  req.body.parentName = menu?.title?.en || "";

  // Handle uploaded image
  if (req.file) {
    req.body.image = `/uploads/details/${req.file.filename}`;
  }

  const created = await detailService.create(req.body);
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.json({ success: true, detail: created });
  }
  req.session = req.session || {};
  req.session.detailMessage = "Created successfully!";
  res.redirect(`/details?menuId=${req.body.parentId}&success=1`);
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
  // Đảm bảo luôn truyền parentId và parentName khi update (for filename)
  if (!req.body.parentId || !req.body.parentName) {
    const detail = await detailService.getDetailById(req.params.id);
    req.body.parentId = req.body.parentId || detail.parentId;
    // Get parentName from menu
    const menu = await menuService.getMenuById(req.body.parentId);
    req.body.parentName = menu?.title?.en || "";
  }
  // Handle uploaded image (overwrite old)
  if (req.file) {
    req.body.image = `/uploads/details/${req.file.filename}`;
  }
  const updated = await detailService.updateDetail(req.params.id, req.body);
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.json({ success: true, detail: updated });
  }
  req.session = req.session || {};
  req.session.detailMessage = "Updated successfully!";
  res.redirect(`/details?menuId=${req.body.parentId}&success=1`);
};

/* ===== DELETE ===== */
exports.delete = async (req, res) => {
  const detail = await detailService.getDetailById(req.params.id);
  await detailService.deleteDetail(req.params.id);
  req.session = req.session || {};
  req.session.detailMessage = "Deleted successfully!";
  res.redirect(`/details?menuId=${detail.parentId}&success=1`);
};

exports.showDetailByMenu = async (req, res) => {
  const menuId = req.params.menuId;
  const menus = await menuService.getAllMenus();
  const details = await detailService.getDetailsByMenu(menuId);

  res.locals.menus = menus;
  res.locals.currentMenuId = menuId;

  let message = null;
  if (req.session && req.session.detailMessage) {
    message = req.session.detailMessage;
    delete req.session.detailMessage;
  }
  res.render("dashboard/details/index", {
    menuId,
    details,
    message,
  });
};
