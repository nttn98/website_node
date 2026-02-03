const express = require("express");
const router = express.Router();
const controller = require("../controllers/dashboard.controller");
const menuController = require("../../menu/controllers/menu.controller");

router.get("/menus", menuController.getAllMenus);
router.get("/menus/create", menuController.createMenuForm);
router.get("/menus/:id/edit", menuController.editMenuForm);

module.exports = router;
