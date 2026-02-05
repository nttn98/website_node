const express = require("express");
const controller = require("../controllers/detail.controllers");

const router = express.Router();

/**
 * @swagger
 * /details:
 *   get:
 *     summary: Lấy danh sách detail
 *     tags:
 *       - Detail
 *     responses:
 *       200:
 *         description: Danh sách detail
 */
router.get("/", controller.index);

/**
 * @swagger
 * /details:
 *   post:
 *     summary: Tạo detail mới
 *     tags:
 *       - Detail
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: string
 *               subParentId:
 *                 type: string
 *               title_en:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/create", controller.create);

/**
 * @swagger
 * /details/{id}:
 *   put:
 *     summary: Cập nhật detail
 *     tags:
 *       - Detail
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
 *               title_en:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post("/:id/update", controller.update);

/**
 * @swagger
 * /details/{id}:
 *   delete:
 *     summary: Xóa detail
 *     tags:
 *       - Detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/:id", controller.delete);

/**
 * @swagger
 * /details/{id}/toggle:
 *   post:
 *     summary: Đổi trạng thái detail
 *     tags:
 *       - Detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 */
router.post("/:id/toggle", controller.toggleStatus);

module.exports = router;
