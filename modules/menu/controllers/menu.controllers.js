const menuService = require("../services/menu.services");
const groupService = require("../../group/services/group.services");
const path = require("path");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

exports.getAllMenus = async (req, res) => {
  const params = getPaginationParams(req, { defaultLimit: 50, maxLimit: 300 });
  const menus = await menuService.getAllMenus();
  const paged = paginateArray(menus, params);
  res.json({ success: true, data: paged.items, pagination: paged.pagination });
};

// Get child menus by parent menu id
exports.getChildren = async (req, res) => {
  const parentId = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(parentId)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const params = getPaginationParams(req, { defaultLimit: 50, maxLimit: 300 });
  const children = await menuService.getMenuChildren(parentId);
  const paged = paginateArray(children, params);
  res.json({ success: true, data: paged.items, pagination: paged.pagination });
};

// Get full child tree by parent menu id
exports.getChildrenTree = async (req, res) => {
  const parentId = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(parentId)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const params = getPaginationParams(req, { defaultLimit: 50, maxLimit: 300 });
  const children = await menuService.getMenuChildrenTree(parentId);
  const paged = paginateArray(children, params);
  res.json({ success: true, data: paged.items, pagination: paged.pagination });
};

exports.createMenu = async (req, res) => {
  let data = { ...req.body };
  if (!data.parentId) data.parentId = null;

  // Handle image upload
  if (req.file) {
    data.image =
      "/uploads/menus/" + (req.file.filename || path.basename(req.file.path));
  }

  const menu = await menuService.createMenu(data);
  res.status(201).json({ success: true, data: menu });
};

exports.updateMenu = async (req, res) => {
  let data = { ...req.body };
  if (!data.parentId) data.parentId = null;

  // Handle image upload
  if (req.file) {
    data.image =
      "/uploads/menus/" + (req.file.filename || path.basename(req.file.path));
  }

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

// Toggle only showHomePage flag without updating other fields
exports.toggleShowHomePage = async (req, res) => {
  try {
    const menu = await menuService.toggleShowHomePage(req.params.id);
    res.json({ success: true, showHomePage: menu.showHomePage });
  } catch (err) {
    console.error("Toggle homepage error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.toggleShowFooter = async (req, res) => {
  try {
    const menu = await menuService.toggleShowFooter(req.params.id);
    res.json({ success: true, showFooter: menu.showFooter });
  } catch (err) {
    console.error("Toggle footer error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.toggleFeaturedInsights = async (req, res) => {
  try {
    const menu = await menuService.toggleFeaturedInsights(req.params.id);
    res.json({
      success: true,
      featuredInsights: menu.featuredInsights,
      caseStudies: menu.caseStudies,
    });
  } catch (err) {
    console.error("Toggle featured insights error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.toggleCaseStudies = async (req, res) => {
  try {
    const menu = await menuService.toggleCaseStudies(req.params.id);
    res.json({
      success: true,
      caseStudies: menu.caseStudies,
      featuredInsights: menu.featuredInsights,
    });
  } catch (err) {
    console.error("Toggle case studies error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};
