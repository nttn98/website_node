const express = require("express");
const controller = require("../controllers/article.controller");

const router = express.Router();

router.get("/", controller.index);
router.get("/create", controller.createForm);
router.post("/create", controller.create);
router.get("/:id/edit", controller.editForm);
router.post("/:id/update", controller.update);
router.delete("/:id", controller.delete);
router.post("/:id/toggle", controller.toggleStatus);

module.exports = router;
