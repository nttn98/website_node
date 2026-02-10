const express = require("express");
const controller = require("../controllers/submission.controllers");

const router = express.Router();

// Public endpoint for submitting forms
router.post("/submit", controller.submit);

// Admin endpoints (JSON)
router.get("/submissions", controller.index);
router.post("/submissions/:id/toggle-handled", controller.toggleHandled);
router.post("/submissions/:id/delete", controller.delete);

module.exports = router;
