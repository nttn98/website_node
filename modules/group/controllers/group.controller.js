exports.toggleStatus = async (req, res) => {
  const group = await groupService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: group.isStatus });
};
const groupService = require("../services/group.service");
const menuService = require("../../menu/services/menu.service");

/* ===== LIST ===== */
exports.index = async (req, res) => {
  const menus = await menuService.getAllMenus();
  const menuId = req.query.menuId || menus[0]?._id;
  const groups = menuId ? await groupService.getDetailsByMenu(menuId) : [];
  res.json({ success: true, menuId, groups });
};

/* ===== CREATE ===== */
exports.createForm = async (req, res) => {
  const menus = await menuService.getAllMenus();
  res.locals.menus = menus;
  res.locals.currentMenuId = req.query.menuId || null;
  res.render("dashboard/groups/create");
};

exports.create = async (req, res) => {
  // Chuẩn hóa listParents
  let listParents = [];
  if (Array.isArray(req.body.listParents)) {
    listParents = req.body.listParents;
  } else if (req.body.parentId && req.body.parentName) {
    listParents = [
      { parentId: req.body.parentId, parentName: req.body.parentName },
    ];
  } else if (req.body.parentId) {
    const menu = await menuService.getMenuById(req.body.parentId);
    listParents = [
      { parentId: req.body.parentId, parentName: menu?.title?.en || "" },
    ];
  }
  // Chuẩn hóa images
  let images = [];
  if (Array.isArray(req.body.images)) images = req.body.images;
  else if (req.file) images = [`/uploads/groups/${req.file.filename}`];
  else if (req.body.image) images = [req.body.image];
  // Chuẩn hóa listButtons
  let listButtons = Array.isArray(req.body.listButtons)
    ? req.body.listButtons
    : [];
  const created = await groupService.create({
    ...req.body,
    listParents,
    images,
    listButtons,
  });
  res.status(201).json({ success: true, group: created });
};

/* ===== EDIT ===== */
exports.editForm = async (req, res) => {
  const group = await groupService.getDetailById(req.params.id);
  const menus = await menuService.getAllMenus();

  res.locals.menus = menus;
  res.locals.currentMenuId = group.parentId.toString();

  res.render("dashboard/groups/edit", { group, menus });
};

exports.update = async (req, res) => {
  // Chuẩn hóa listParents
  let listParents = [];
  if (Array.isArray(req.body.listParents)) {
    listParents = req.body.listParents;
  } else if (req.body.parentId && req.body.parentName) {
    listParents = [
      { parentId: req.body.parentId, parentName: req.body.parentName },
    ];
  } else if (req.body.parentId) {
    const menu = await menuService.getMenuById(req.body.parentId);
    listParents = [
      { parentId: req.body.parentId, parentName: menu?.title?.en || "" },
    ];
  }
  // Chuẩn hóa images
  let images = [];
  if (Array.isArray(req.body.images)) images = req.body.images;
  else if (req.file) images = [`/uploads/groups/${req.file.filename}`];
  else if (req.body.image) images = [req.body.image];
  // Chuẩn hóa listButtons
  let listButtons = Array.isArray(req.body.listButtons)
    ? req.body.listButtons
    : [];
  const updated = await groupService.updateDetail(req.params.id, {
    ...req.body,
    listParents,
    images,
    listButtons,
  });
  res.json({ success: true, group: updated });
};

/* ===== DELETE ===== */
exports.delete = async (req, res) => {
  await groupService.deleteDetail(req.params.id);
  res.json({ success: true });
};

exports.showDetailByMenu = async (req, res) => {
  const menuId = req.params.menuId;
  const groups = await groupService.getDetailsByMenu(menuId);
  res.json({ success: true, menuId, groups });
};
