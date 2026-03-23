const express = require("express");
const router = express.Router();
const controller = require("../controllers/tag.controllers");
const { requireLogin } = require("../../../middleware/auth");

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Lấy danh sách tag
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 50
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách tag
 */
router.get("/", controller.getAllTags);

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: Lấy chi tiết tag theo id
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết tag
 *       404:
 *         description: Không tìm thấy tag
 */
router.get("/:id", controller.getTagById);

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Tạo tag mới
 *     tags:
 *       - Tags
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo tag thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/", requireLogin, controller.createTag);

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: Cập nhật tag
 *     tags:
 *       - Tags
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
 *               slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật tag thành công
 *       404:
 *         description: Không tìm thấy tag
 */
router.put("/:id", requireLogin, controller.updateTag);

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Xóa tag (soft delete)
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa tag thành công
 */
router.delete("/:id", requireLogin, controller.deleteTag);

/**
 * @swagger
 * /api/tags/{id}/toggle:
 *   patch:
 *     summary: Đổi trạng thái hiển thị của tag
 *     tags:
 *       - Tags
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 *       404:
 *         description: Không tìm thấy tag
 */
router.patch("/:id/toggle", requireLogin, controller.toggleStatus);

module.exports = router;
