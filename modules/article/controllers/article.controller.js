const articleService = require("../services/article.service");
const detailService = require("../../detail/services/detail.service");
const menuService = require("../../menu/services/menu.service");

exports.index = async (req, res) => {
  const articles = await articleService.getAllArticles();
  res.render("dashboard/articles/index", { articles });
};

exports.createForm = async (req, res) => {
  const details = await detailService.getAllDetails();
  const menus = await menuService.getAllMenus();
  res.render("dashboard/articles/create", { details, menus });
};

exports.create = async (req, res) => {
  // Lấy tên cha/subcha
  const detail = await detailService.getDetailById(req.body.parentId);
  const menu = await menuService.getMenuById(req.body.subParentId);
  req.body.parentName = detail?.title?.en || "";
  req.body.subParentName = menu?.title?.en || "";
  await articleService.createArticle(req.body);
  res.redirect("/articles");
};

exports.editForm = async (req, res) => {
  const article = await articleService.getArticleById(req.params.id);
  const details = await detailService.getAllDetails();
  const menus = await menuService.getAllMenus();
  res.render("dashboard/articles/edit", { article, details, menus });
};

exports.update = async (req, res) => {
  await articleService.updateArticle(req.params.id, req.body);
  res.redirect("/articles");
};

exports.delete = async (req, res) => {
  await articleService.deleteArticle(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  await articleService.toggleStatus(req.params.id);
  res.redirect("back");
};
