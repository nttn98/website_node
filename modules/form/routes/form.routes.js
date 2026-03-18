const express = require("express");
const controller = require("../controllers/form.controllers");

const router = express.Router();

/**
 * @swagger
 * /forms:
 *   get:
 *     summary: Get all forms (admin view)
 *     tags:
 *       - Forms
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
 *           default: 30
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of all forms
 */
router.get("/", controller.index);

/**
 * @swagger
 * /forms/create:
 *   get:
 *     summary: Show create form page
 *     tags:
 *       - Forms
 *     responses:
 *       200:
 *         description: Create form page
 */
router.get("/create", controller.createForm);

/**
 * @swagger
 * /forms/create:
 *   post:
 *     summary: Create a new form
 *     tags:
 *       - Forms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Form created successfully
 *       500:
 *         description: Server error
 */
router.post("/create", controller.create);

/**
 * @swagger
 * /forms/{id}/edit:
 *   get:
 *     summary: Show edit form page
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Form ID
 *     tags:
 *       - Forms
 *     responses:
 *       200:
 *         description: Edit form page
 *       404:
 *         description: Form not found
 */
router.get("/:id/edit", controller.editForm);

/**
 * @swagger
 * /forms/{id}/update:
 *   post:
 *     summary: Update an existing form
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Form ID
 *     tags:
 *       - Forms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Form updated successfully
 *       404:
 *         description: Form not found
 *       500:
 *         description: Server error
 */
router.post("/:id/update", controller.update);

/**
 * @swagger
 * /forms/{id}:
 *   delete:
 *     summary: Delete a form
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Form ID
 *     tags:
 *       - Forms
 *     responses:
 *       200:
 *         description: Form deleted successfully
 *       404:
 *         description: Form not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", controller.delete);

/**
 * @swagger
 * /forms/{id}/toggle:
 *   post:
 *     summary: Toggle form status (active/inactive)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Form ID
 *     tags:
 *       - Forms
 *     responses:
 *       200:
 *         description: Form status toggled successfully
 *       404:
 *         description: Form not found
 *       500:
 *         description: Server error
 */
router.post("/:id/toggle", controller.toggleStatus);

/**
 * @swagger
 * /forms/{id}:
 *   get:
 *     summary: Get form by ID (public endpoint)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Form ID
 *     tags:
 *       - Forms
 *     responses:
 *       200:
 *         description: Form data
 *       404:
 *         description: Form not found
 *       500:
 *         description: Server error
 */
router.get("/:id", controller.getForm);

module.exports = router;
