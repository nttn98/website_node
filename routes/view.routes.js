const express = require("express");
const menuService = require("../modules/menu/services/menu.services");
const router = express.Router();

function requireLoginView(req, res, next) {
  if (!req.session.user) return res.redirect("/user/login");
  next();
}

//#region Menus
router.get("/", requireLoginView, (req, res) => {
  res.redirect("/dashboard/menus");
});

router.get("/dashboard/menus", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.locals.currentPage = "menus";
  res.render("dashboard/menus/index");
});

router.get("/dashboard/menus/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/menus/create");
});
router.get("/dashboard/menus/:id/edit", requireLoginView, async (req, res) => {
  const [menus, menu] = await Promise.all([
    menuService.getAllMenus(),
    menuService.getMenuById(req.params.id),
  ]);
  res.render("dashboard/menus/edit", { menus, menu });
});
//endregion

//#region Groups
router.get("/dashboard/groups", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  if (!req.query.menuId) res.locals.currentPage = "groups";
  if (req.query.menuId) res.locals.currentMenuId = req.query.menuId;
  res.render("dashboard/groups/index");
});
router.get("/dashboard/groups/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  if (!req.query.menuId) res.locals.currentPage = "groups";
  if (req.query.menuId) res.locals.currentMenuId = req.query.menuId;
  res.render("dashboard/groups/create");
});
router.get("/dashboard/groups/:id/edit", requireLoginView, async (req, res) => {
  const groupService = require("../modules/group/services/group.services");
  const group = await groupService.getGroupById(req.params.id);
  res.locals.menus = await menuService.getAllMenus();
  if (req.query.menuId) res.locals.currentMenuId = req.query.menuId;
  res.render("dashboard/groups/edit", { id: req.params.id, group });
});
//#endregion

//#region Buttons
router.get("/dashboard/buttons", requireLoginView, async (req, res) => {
  const buttonService = require("../modules/button/services/button.services");
  res.locals.menus = await menuService.getAllMenus();
  res.locals.currentPage = "buttons";
  res.render("dashboard/buttons/index");
});

router.get("/dashboard/buttons/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.locals.currentPage = "buttons";
  res.render("dashboard/buttons/create");
});

router.get(
  "/dashboard/buttons/:id/edit",
  requireLoginView,
  async (req, res) => {
    const buttonService = require("../modules/button/services/button.services");
    const button = await buttonService.getButtonById(req.params.id);
    res.locals.menus = await menuService.getAllMenus();
    res.render("dashboard/buttons/edit", { button });
  }
);
//#endregion

//#region Details
router.get("/dashboard/details/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/details/create");
});
router.get(
  "/dashboard/details/:id/edit",
  requireLoginView,
  async (req, res) => {
    res.locals.menus = await menuService.getAllMenus();
    res.render("dashboard/details/edit", { id: req.params.id });
  }
);
router.get("/dashboard/details", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/details/index");
});
//#endregion

module.exports = router;
