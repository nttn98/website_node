const express = require("express");
const router = express.Router();
const controller = require("../controllers/menu.controller");

/**
 * @swagger
 * /api/menus:
 *   get:
 *     summary: Lấy danh sách menu
 *     tags:
 *       - Menu
 *     responses:
 *       200:
 *         description: Danh sách menu
 */

// ===== GET =====
/**
 * @swagger
 * /api/menus:
 *   get:
 *     summary: Lấy danh sách menu
 *     responses:
 *       200:
 *         description: Danh sách menu
 */
router.get("/", controller.getAllMenus);

// ===== POST =====
/**
 * @swagger
 * /api/menus:
 *   post:
 *     summary: Tạo menu mới
 *     tags:
 *       - Menu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       302:
 *         description: Redirect sau khi tạo menu
 */
router.post("/", controller.createMenu);

// ===== PUT =====
/**
 * @swagger
 * /api/menus/{id}:
 *   put:
 *     summary: Cập nhật menu
 *     tags:
 *       - Menu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       302:
 *         description: Redirect sau khi cập nhật menu
 */
router.put("/:id", controller.updateMenu);

// ===== DELETE =====
/**
 * @swagger
 * /api/menus/{id}:
 *   delete:
 *     summary: Xóa menu
 *     tags:
 *       - Menu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
router.delete("/:id", controller.deleteMenu);

// ===== PATCH =====
/**
 * @swagger
 * /api/menus/{id}/toggle:
 *   patch:
 *     summary: Đổi trạng thái menu
 *     tags:
 *       - Menu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
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
router.patch("/:id/toggle", controller.toggleMenu);

module.exports = router;
