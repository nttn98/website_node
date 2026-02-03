const express = require("express");
const controller = require("../controllers/group.controller");
const upload = require("../../../middleware/upload");

const router = express.Router();

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: Lấy danh sách group theo menuId (query)
 *     parameters:
 *       - in: query
 *         name: menuId
 *         schema:
 *           type: string
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Danh sách group
 */
router.get("/", controller.index);

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Tạo group mới
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: string
 *               title_en:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     tags:
 *       - Group
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/create", upload.single("image"), controller.create);

/**
 * @swagger
 * /groups/{id}:
 *   put:
 *     summary: Cập nhật group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: string
 *               title_en:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post("/:id/update", upload.single("image"), controller.update);

/**
 * @swagger
 * /groups/{id}:
 *   delete:
 *     summary: Xóa group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/:id", controller.delete);

/**
 * @swagger
 * /groups/{id}/toggle:
 *   post:
 *     summary: Đổi trạng thái group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 */
router.post("/:id/toggle", controller.toggleStatus);

/**
 * @swagger
 * /groups/{menuId}:
 *   get:
 *     summary: Lấy group theo menuId (params)
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema:
 *           type: string
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Danh sách group
 */
router.get("/:menuId", controller.showDetailByMenu);

module.exports = router;
