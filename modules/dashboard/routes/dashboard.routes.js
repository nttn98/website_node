const express = require("express");
const router = express.Router();
const controller = require("../controllers/dashboard.controllers");

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Lấy dashboard (danh sách menu)
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Danh sách menu
 */
router.get("/", controller.index);

module.exports = router;
