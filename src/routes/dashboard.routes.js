const express = require("express");
const router = express.Router();
const controller = require("../controllers/menu.controller");

router.get("/menus", controller.getAllMenus);
router.get("/menus/create", controller.createMenuForm);
router.get("/menus/:id/edit", controller.editMenuForm);

module.exports = router;
