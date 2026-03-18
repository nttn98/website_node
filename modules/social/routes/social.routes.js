const express = require("express");
const router = express.Router();
const controller = require("../controllers/social.controllers");
const { requireLogin } = require("../../../middleware/auth");

/**
 * @swagger
 * /api/socials:
 *   get:
 *     summary: Lấy danh sách social công khai
 *     tags:
 *       - Social
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
 *           default: 20
 *         description: Số phần tử mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách social items
 */
// Public API to get social items for homepage
router.get("/", controller.getPublic);

// Admin update (protected)
/**
 * @swagger
 * /api/socials:
 *   post:
 *     summary: Cập nhật danh sách social (tạo hoặc cập nhật nhiều mục)
 *     tags:
 *       - Social
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     iconClass:
 *                       type: string
 *                     url:
 *                       type: string
 *                     order:
 *                       type: number
 *                     isStatus:
 *                       type: boolean
 *                     isActive:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: "Cập nhật thành công, trả về danh sách items"
 */
router.post("/", requireLogin, controller.update);

// Toggle visibility of a single item
/**
 * @swagger
 * /api/socials/{id}/toggle-status:
 *   post:
 *     summary: Toggle trạng thái isStatus cho mục social
 *     tags:
 *       - Social
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trạng thái thay đổi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isStatus:
 *                   type: boolean
 */
router.post("/:id/toggle-status", requireLogin, controller.toggleItemStatus);
// Soft-delete / restore a single item
/**
 * @swagger
 * /api/socials/{id}/toggle-active:
 *   post:
 *     summary: Toggle trạng thái isActive (soft delete / restore)
 *     tags:
 *       - Social
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trạng thái active thay đổi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isActive:
 *                   type: boolean
 */
router.post("/:id/toggle-active", requireLogin, controller.toggleItemActive);

module.exports = router;
