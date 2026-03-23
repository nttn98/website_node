const express = require("express");
const router = express.Router();
const controller = require("../controllers/menu.controllers");
const upload = require("../../../middleware/upload");

// ===== GET =====
/**
 * @swagger
 * /api/menus:
 *   get:
 *     summary: Lấy danh sách menu
 *     tags:
 *       - Menu
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
 *           default: 50
 *         description: Số phần tử mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách menu
 */
router.get("/", controller.getAllMenus);

// GET children groups by menu id
/**
 * @swagger
 * /api/menus/{id}/children:
 *   get:
 *     summary: Lấy các group con theo menuId
 *     parameters:
 *       - in: path
 *         name: id
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
 *           default: 50
 *         description: Số phần tử mỗi trang
 *     tags:
 *       - Menu
 *     responses:
 *       200:
 *         description: Danh sách group
 */
router.get("/:id/children", controller.getChildren);

// GET children tree by menu id
/**
 * @swagger
 * /api/menus/{id}/children-tree:
 *   get:
 *     summary: Lấy cây menu con theo menuId
 *     parameters:
 *       - in: path
 *         name: id
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
 *           default: 50
 *         description: Số phần tử mỗi trang
 *     tags:
 *       - Menu
 *     responses:
 *       200:
 *         description: Cây menu con
 */
router.get("/:id/children-tree", controller.getChildrenTree);

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Menu title (EN)
 *               subtitle:
 *                 type: string
 *                 description: Menu subtitle (EN)
 *               route:
 *                 type: string
 *                 description: Menu route path
 *               parentId:
 *                 type: string
 *                 description: Parent menu ID (for sub-menus)
 *               type:
 *                 type: string
 *                 enum: [top, bot]
 *                 description: Menu position
 *               order:
 *                 type: number
 *                 default: 0
 *               tagId:
 *                 type: string
 *                 description: Selected tag id
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Menu feature image
 *               isButton:
 *                 type: boolean
 *                 description: Display as button
 *               showHomePage:
 *                 type: boolean
 *                 description: Show on homepage (only for non-root menus)
 *     responses:
 *       201:
 *         description: Menu created successfully
 */
router.post("/", upload.single("image"), controller.createMenu);

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
 *         description: Menu ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title_en:
 *                 type: string
 *               title_vi:
 *                 type: string
 *               title_zh:
 *                 type: string
 *               subtitle_en:
 *                 type: string
 *               subtitle_vi:
 *                 type: string
 *               subtitle_zh:
 *                 type: string
 *               route:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [top, bot]
 *               order:
 *                 type: number
 *               tagId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               isButton:
 *                 type: boolean
 *               showHomePage:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Menu updated successfully
 */
router.put("/:id", upload.single("image"), controller.updateMenu);

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

/**
 * @swagger
 * /api/menus/{id}/toggle-homepage:
 *   patch:
 *     summary: Đổi trạng thái hiển thị trên homepage
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
 *                 showHomePage:
 *                   type: boolean
 */
router.patch("/:id/toggle-homepage", controller.toggleShowHomePage);

/**
 * @swagger
 * /api/menus/{id}/toggle-featured-insights:
 *   patch:
 *     summary: Đổi trạng thái Featured Insights
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
 *                 featuredInsights:
 *                   type: boolean
 */
router.patch(
  "/:id/toggle-featured-insights",
  controller.toggleFeaturedInsights
);

module.exports = router;
