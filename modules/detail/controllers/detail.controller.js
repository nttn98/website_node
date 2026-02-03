const detailService = require("../services/detail.service");
const groupService = require("../../group/services/group.service");
const menuService = require("../../menu/services/menu.service");

exports.index = async (req, res) => {
  const details = await detailService.getAllArticles();
  res.render("dashboard/details/index", { details });
};

exports.createForm = async (req, res) => {
  const groups = await groupService.getAllDetails();
  const menus = await menuService.getAllMenus();
  res.render("dashboard/details/create", { groups, menus });
};

exports.create = async (req, res) => {
  // Lấy tên cha/subcha
  const group = await groupService.getDetailById(req.body.parentId);
  const menu = await menuService.getMenuById(req.body.subParentId);
  req.body.parentName = group?.title?.en || "";
  req.body.subParentName = menu?.title?.en || "";
  await detailService.createArticle(req.body);
  res.redirect("/details");
};

exports.editForm = async (req, res) => {
  const detail = await detailService.getArticleById(req.params.id);
  const groups = await groupService.getAllDetails();
  const menus = await menuService.getAllMenus();
  res.render("dashboard/details/edit", { detail, groups, menus });
};

exports.update = async (req, res) => {
  await detailService.updateArticle(req.params.id, req.body);
  res.redirect("/details");
};

exports.delete = async (req, res) => {
  await detailService.deleteArticle(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  await detailService.toggleStatus(req.params.id);
  res.redirect("back");
};
