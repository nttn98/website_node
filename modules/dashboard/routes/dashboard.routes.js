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
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 30
 *         description: Số phần tử mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách menu
 */
router.get("/", controller.index);

module.exports = router;
