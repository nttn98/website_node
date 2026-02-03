const express = require("express");
const controller = require("../controllers/detail.controller");
const upload = require("../../../middleware/upload");

const router = express.Router();

router.get("/", controller.index);
router.get("/create", controller.createForm);
router.post("/create", upload.single("image"), controller.create);
router.get("/:id/edit", controller.editForm);
router.post("/:id/update", upload.single("image"), controller.update);
router.delete("/:id", controller.delete);
router.post("/:id/toggle", controller.toggleStatus);
router.get("/:menuId", controller.showDetailByMenu);

module.exports = router;
