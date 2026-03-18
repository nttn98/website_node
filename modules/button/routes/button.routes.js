const express = require("express");
const controller = require("../controllers/button.controllers");

const router = express.Router();

/* ===== BUTTON API ROUTES ===== */

/**
 * @swagger
 * /buttons:
 *   get:
 *     summary: Get all buttons
 *     description: Returns all active buttons with populated form data
 *     tags:
 *       - Buttons
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of all buttons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 buttons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: object
 *                         properties:
 *                           en:
 *                             type: string
 *                           vi:
 *                             type: string
 *                           zh:
 *                             type: string
 *                       type:
 *                         type: string
 *                         enum: [route, form]
 *                       route:
 *                         type: string
 *                       form:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           shortName:
 *                             type: string
 *                       isStatus:
 *                         type: boolean
 *       500:
 *         description: Server error
 */
router.get("/", controller.index);

/**
 * @swagger
 * /buttons/create:
 *   post:
 *     summary: Create a new button
 *     description: Creates a new button with multi-language title support
 *     tags:
 *       - Buttons
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title_en
 *             properties:
 *               title_en:
 *                 type: string
 *                 description: Button title in English
 *               title_vi:
 *                 type: string
 *                 description: Button title in Vietnamese
 *               title_zh:
 *                 type: string
 *                 description: Button title in Chinese
 *               type:
 *                 type: string
 *                 enum: [route, form]
 *                 default: route
 *                 description: Button type (route for link, form to open a form)
 *               route:
 *                 type: string
 *                 description: URL or route path (when type is route)
 *               formId:
 *                 type: string
 *                 description: Form ID to open (when type is form)
 *     responses:
 *       201:
 *         description: Button created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 button:
 *                   type: object
 *       400:
 *         description: Invalid input (title required)
 *       500:
 *         description: Server error
 */
router.post("/create", controller.create);

/**
 * @swagger
 * /buttons/{id}/update:
 *   post:
 *     summary: Update an existing button
 *     description: Updates button properties including title, type, route, and form
 *     tags:
 *       - Buttons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Button ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title_en
 *             properties:
 *               title_en:
 *                 type: string
 *               title_vi:
 *                 type: string
 *               title_zh:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [route, form]
 *               route:
 *                 type: string
 *               formId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Button updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 button:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/:id/update", controller.update);

/**
 * @swagger
 * /buttons/{id}:
 *   delete:
 *     summary: Delete a button
 *     description: Soft deletes a button by setting isActive to false
 *     tags:
 *       - Buttons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Button ID to delete
 *     responses:
 *       200:
 *         description: Button deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
router.delete("/:id", controller.delete);

/**
 * @swagger
 * /buttons/{id}/toggle:
 *   post:
 *     summary: Toggle button status
 *     description: Toggles the isStatus property (show/hide button)
 *     tags:
 *       - Buttons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Button ID
 *     responses:
 *       200:
 *         description: Status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isStatus:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
router.post("/:id/toggle", controller.toggleStatus);

module.exports = router;
