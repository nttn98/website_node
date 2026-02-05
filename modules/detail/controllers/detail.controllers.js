const detailService = require("../services/detail.services");
const groupService = require("../../group/services/group.services");
const menuService = require("../../menu/services/menu.services");

exports.index = async (req, res) => {
  const details = await detailService.getAllArticles();
  res.json({ success: true, data: details });
};

exports.createForm = async (req, res) => {
  const groups = await groupService.getAllDetails();
  const menus = await menuService.getAllMenus();
  res.render("dashboard/details/create", { groups, menus });
};

exports.create = async (req, res) => {
  const group = await groupService.getDetailById(req.body.parentId);
  const menu = await menuService.getMenuById(req.body.subParentId);
  req.body.parentName = group?.title?.en || "";
  req.body.subParentName = menu?.title?.en || "";
  const created = await detailService.createArticle(req.body);
  res.status(201).json({ success: true, data: created });
};

exports.editForm = async (req, res) => {
  const detail = await detailService.getArticleById(req.params.id);
  const groups = await groupService.getAllDetails();
  const menus = await menuService.getAllMenus();
  res.render("dashboard/details/edit", { detail, groups, menus });
};

exports.update = async (req, res) => {
  const updated = await detailService.updateArticle(req.params.id, req.body);
  res.json({ success: true, data: updated });
};

exports.delete = async (req, res) => {
  await detailService.deleteArticle(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  const detail = await detailService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: detail.isStatus });
};
