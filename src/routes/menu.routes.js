const express = require("express");
const router = express.Router();
const controller = require("../controllers/menu.controller");

router.post("/", controller.createMenu);
router.put("/:id", controller.updateMenu);
router.delete("/:id", controller.deleteMenu);
router.patch("/:id/toggle", controller.toggleMenu);

module.exports = router;
