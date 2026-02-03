const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");
const { requireLogin } = require("../../../middleware/auth");

// Xử lý logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/user/login");
  });
});

// Xử lý đăng nhập
router.post("/login", controller.login);

// Hiển thị trang login (không dùng layout dashboard)
router.get("/login", (req, res) => {
  res.render("user/login", { layout: false });
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách user
 *     tags:
 *       - User
 *     responses:
 *       200:
 *         description: Danh sách user
 */
router.get("/users", requireLogin, controller.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Lấy user theo id
 *     tags:
 *       - User
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin user
 */
router.get("/users/:id", requireLogin, controller.getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Tạo user mới
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/users", requireLogin, controller.createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Cập nhật user
 *     tags:
 *       - User
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
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/users/:id", requireLogin, controller.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Xóa user
 *     tags:
 *       - User
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
router.delete("/users/:id", requireLogin, controller.deleteUser);

module.exports = router;
