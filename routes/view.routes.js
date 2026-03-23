const express = require("express");
const menuService = require("../modules/menu/services/menu.services");
const formService = require("../modules/form/services/form.services");
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
  res.locals.menus = await menuService.getAllMenusCached();
  res.locals.currentPage = "menus";
  res.render("dashboard/menus/index");
});

router.get("/dashboard/menus/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  res.render("dashboard/menus/create");
});
router.get("/dashboard/menus/:id/edit", requireLoginView, async (req, res) => {
  const [menus, menu] = await Promise.all([
    menuService.getAllMenusCached(),
    menuService.getMenuById(req.params.id),
  ]);
  res.render("dashboard/menus/edit", { menus, menu });
});
//endregion

//#region Groups
router.get("/dashboard/groups", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  if (!req.query.menuId) res.locals.currentPage = "groups";
  if (req.query.menuId) res.locals.currentMenuId = req.query.menuId;
  res.render("dashboard/groups/index");
});
router.get("/dashboard/groups/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  if (!req.query.menuId) res.locals.currentPage = "groups";
  if (req.query.menuId) res.locals.currentMenuId = req.query.menuId;
  res.render("dashboard/groups/create");
});
router.get("/dashboard/groups/:id/edit", requireLoginView, async (req, res) => {
  const groupService = require("../modules/group/services/group.services");
  const [group, menus] = await Promise.all([
    groupService.getGroupById(req.params.id),
    menuService.getAllMenusCached(),
  ]);
  res.locals.menus = menus;
  if (req.query.menuId) res.locals.currentMenuId = req.query.menuId;
  res.render("dashboard/groups/edit", { id: req.params.id, group });
});
//#endregion

//#region Buttons
router.get("/dashboard/buttons", requireLoginView, async (req, res) => {
  const buttonService = require("../modules/button/services/button.services");
  res.locals.menus = await menuService.getAllMenusCached();
  res.locals.currentPage = "buttons";
  res.render("dashboard/buttons/index");
});

//#region Socials
router.get("/dashboard/socials", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  res.locals.currentPage = "socials";
  res.render("dashboard/socials/index");
});

router.get("/dashboard/tags", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  res.locals.currentPage = "tags";
  res.render("dashboard/tags/index");
});

router.get("/dashboard/buttons/create", requireLoginView, async (req, res) => {
  const [menus, forms] = await Promise.all([
    menuService.getAllMenusCached(),
    formService.getAllForms(),
  ]);
  res.locals.menus = menus;
  res.locals.currentPage = "buttons";
  // Provide available forms for selector in create view
  res.locals.forms = forms;
  res.render("dashboard/buttons/create");
});

router.get(
  "/dashboard/buttons/:id/edit",
  requireLoginView,
  async (req, res) => {
    const buttonService = require("../modules/button/services/button.services");
    const [button, menus, forms] = await Promise.all([
      buttonService.getButtonById(req.params.id),
      menuService.getAllMenusCached(),
      formService.getAllForms(),
    ]);
    res.locals.menus = menus;
    res.locals.currentPage = "buttons";
    // Provide available forms for selector in edit view
    res.locals.forms = forms;
    res.render("dashboard/buttons/edit", { button });
  }
);
//#endregion

//#region Details
router.get("/dashboard/details/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  res.render("dashboard/details/create");
});
router.get(
  "/dashboard/details/:id/edit",
  requireLoginView,
  async (req, res) => {
    res.locals.menus = await menuService.getAllMenusCached();
    res.render("dashboard/details/edit", { id: req.params.id });
  }
);
router.get("/dashboard/details", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  res.render("dashboard/details/index");
});
//#endregion

//#region Forms
router.get("/dashboard/forms", requireLoginView, async (req, res) => {
  const formService = require("../modules/form/services/form.services");
  const [menus, forms] = await Promise.all([
    menuService.getAllMenusCached(),
    formService.getAllForms(),
  ]);
  res.locals.menus = menus;
  res.locals.currentPage = "forms";
  res.render("dashboard/forms/index", { forms });
});
router.get("/dashboard/forms/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenusCached();
  res.locals.currentPage = "forms";
  res.render("dashboard/forms/create");
});
router.get("/dashboard/forms/:id/edit", requireLoginView, async (req, res) => {
  const formService = require("../modules/form/services/form.services");
  const [form, menus] = await Promise.all([
    formService.getFormById(req.params.id),
    menuService.getAllMenusCached(),
  ]);
  res.locals.menus = menus;
  res.locals.currentPage = "forms";
  res.render("dashboard/forms/edit", { form });
});

router.get(
  "/dashboard/forms/submissions",
  requireLoginView,
  async (req, res) => {
    res.locals.menus = await menuService.getAllMenusCached();
    res.locals.currentPage = "forms";
    res.render("dashboard/forms/submissions/index");
  }
);
//#endregion

//#region Submissions
router.get("/dashboard/submissions", requireLoginView, async (req, res) => {
  const submissionService = require("../modules/form/services/submission.services");
  res.locals.menus = await menuService.getAllMenusCached();
  res.locals.currentPage = "submissions";
  res.render("dashboard/forms/submissions/index");
});
//#endregion

module.exports = router;
