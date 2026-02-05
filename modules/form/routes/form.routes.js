const express = require("express");
const controller = require("../controllers/form.controllers");

const router = express.Router();

router.get("/", controller.index);
router.post("/create", controller.create);
router.post("/:id/update", controller.update);
router.delete("/:id", controller.delete);
router.post("/:id/toggle", controller.toggleStatus);

module.exports = router;
