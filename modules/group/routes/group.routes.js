const express = require("express");
const controller = require("../controllers/group.controllers");
const upload = require("../../../middleware/upload");

const router = express.Router();

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: Lấy danh sách group
 *     tags:
 *       - Group
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
 *         description: Danh sách group
 */
router.get("/", controller.index);

/**
 * @swagger
 * /groups/next-order/{menuId}:
 *   get:
 *     summary: Lấy thứ tự tiếp theo cho group trong menu
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
 *         description: Thứ tự tiếp theo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nextOrder:
 *                   type: integer
 */
router.get("/next-order/:menuId", controller.getNextOrder);

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
 * /groups/menu/{menuId}:
 *   get:
 *     summary: Lấy group theo menuId (params)
 *     parameters:
 *       - in: path
 *         name: menuId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của menu
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
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Danh sách group
 */
router.get("/menu/:menuId", controller.showGroupByMenu);

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: Lấy group theo ID
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
 *         description: Thông tin group
 */
router.get("/:id", controller.getById);

/**
 * @swagger
 * /groups/{id}/order:
 *   put:
 *     summary: Cập nhật thứ tự của group trong menu
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
 *               parentId:
 *                 type: string
 *               order:
 *                 type: integer
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/:id/order", controller.updateOrder);

/**
 * @swagger
 * /groups/update-orders:
 *   put:
 *     summary: Cập nhật thứ tự nhiều groups
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     groupId:
 *                       type: string
 *                     order:
 *                       type: integer
 *               parentId:
 *                 type: string
 *     tags:
 *       - Group
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/update-orders", controller.updateOrders);

module.exports = router;
