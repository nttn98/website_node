const express = require("express");
const controller = require("../controllers/submission.controllers");

const router = express.Router();

/**
 * @swagger
 * /forms/submit:
 *   post:
 *     summary: Submit a form response
 *     tags:
 *       - Forms
 *     description: Public endpoint for submitting form data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               formId:
 *                 type: string
 *                 description: Optional form ID
 *               formType:
 *                 type: string
 *                 description: Form type/route (e.g., quote, contact)
 *               data:
 *                 type: object
 *                 description: Form submission data
 *     responses:
 *       200:
 *         description: Form submission successful
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post("/submit", controller.submit);

/**
 * @swagger
 * /forms/submissions:
 *   get:
 *     summary: Get all form submissions (admin)
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
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of all form submissions
 *       401:
 *         description: Unauthorized
 */
router.get("/submissions", controller.index);

/**
 * @swagger
 * /forms/submissions/{id}/toggle-handled:
 *   post:
 *     summary: Toggle submission handled status (admin)
 *     tags:
 *       - Forms
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Status toggled successfully
 *       404:
 *         description: Submission not found
 *       401:
 *         description: Unauthorized
 */
router.post("/submissions/:id/toggle-handled", controller.toggleHandled);

/**
 * @swagger
 * /forms/submissions/{id}/delete:
 *   post:
 *     summary: Delete a form submission (admin)
 *     tags:
 *       - Forms
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *       404:
 *         description: Submission not found
 *       401:
 *         description: Unauthorized
 */
router.post("/submissions/:id/delete", controller.delete);

module.exports = router;
