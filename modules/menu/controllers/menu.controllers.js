const menuService = require("../services/menu.services");
const groupService = require("../../group/services/group.services");

exports.getAllMenus = async (req, res) => {
  const menus = await menuService.getAllMenus();
  res.json({ success: true, data: menus });
};

// Get child menus by parent menu id
exports.getChildren = async (req, res) => {
  const parentId = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(parentId)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const children = await menuService.getMenuChildren(parentId);
  res.json({ success: true, data: children });
};

// Get full child tree by parent menu id
exports.getChildrenTree = async (req, res) => {
  const parentId = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(parentId)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const children = await menuService.getMenuChildrenTree(parentId);
  res.json({ success: true, data: children });
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
