const menuService = require("../services/menu.service");

exports.getAllMenus = async (req, res) => {
  const menus = await menuService.getAllMenus();
  res.json({ success: true, data: menus });
};

exports.createMenu = async (req, res) => {
  let data = { ...req.body };
  if (!data.parentId) data.parentId = null;
  const menu = await menuService.createMenu(data);
  res.status(201).json({ success: true, data: menu });
};

exports.updateMenu = async (req, res) => {
  let data = { ...req.body };
  if (!data.parentId) data.parentId = null;
  const menu = await menuService.updateMenu(req.params.id, data);
  res.json({ success: true, data: menu });
};

exports.deleteMenu = async (req, res) => {
  await menuService.deleteMenu(req.params.id);
  res.json({ success: true });
};

exports.toggleMenu = async (req, res) => {
  const menu = await menuService.toggleMenu(req.params.id);
  res.json({ success: true, isStatus: menu.isStatus });
};
