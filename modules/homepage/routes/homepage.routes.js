const express = require("express");
const router = express.Router();
const homepageController = require("../controllers/homepage.controllers");

/* ===== HOMEPAGE API ROUTES ===== */

/**
 * @swagger
 * /api/homepage:
 *   get:
 *     summary: Get all homepage data in one call (recommended)
 *     description: Returns all homepage data including menus, hero group, and socials. Optimized for single API call.
 *     tags:
 *       - Homepage
 *     parameters:
 *       - in: query
 *         name: menuLimit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 8
 *         description: Max number of items returned for solutionsMenus/industryMenus/insightsMenus
 *     responses:
 *       200:
 *         description: All homepage data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     heroGroup:
 *                       type: object
 *                       properties:
 *                         videoShareList:
 *                           $ref: '#/components/schemas/VideoShareList'
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/", homepageController.getHomepageData);

/**
 * @swagger
 * /api/homepage/top-menus:
 *   get:
 *     summary: Get top navigation menus
 *     description: Returns root menus without parentId for top navigation bar
 *     tags:
 *       - Homepage
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
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of top menus
 *       500:
 *         description: Server error
 */
router.get("/top-menus", homepageController.getTopMenus);

/**
 * @swagger
 * /api/homepage/bottom-menus:
 *   get:
 *     summary: Get bottom footer menus
 *     description: Returns menus for footer navigation
 *     tags:
 *       - Homepage
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of bottom menus
 *       500:
 *         description: Server error
 */
router.get("/bottom-menus", homepageController.getBottomMenus);

/**
 * @swagger
 * /api/homepage/hero:
 *   get:
 *     summary: Get hero section group
 *     description: Returns the hero/banner group for homepage header section
 *     tags:
 *       - Homepage
 *     responses:
 *       200:
 *         description: Hero group data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videoShareList:
 *                       $ref: '#/components/schemas/VideoShareList'
 *       500:
 *         description: Server error
 */
router.get("/hero", homepageController.getHeroGroup);

/**
 * @swagger
 * /api/homepage/socials:
 *   get:
 *     summary: Get social media links
 *     description: Returns active social media links for homepage footer
 *     tags:
 *       - Homepage
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
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of social media links
 *       500:
 *         description: Server error
 */
router.get("/socials", homepageController.getSocials);

/**
 * @swagger
 * /api/homepage/menu-parents:
 *   get:
 *     summary: Get root menu parents (for homepage)
 *     description: Returns menus with parentId null
 *     tags:
 *       - Homepage
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
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of root menus
 *       500:
 *         description: Server error
 */
router.get("/menu-parents", homepageController.getMenuParents);

/**
 * @swagger
 * /api/homepage/solutions:
 *   get:
 *     summary: "Get Solutions menu tree (ID: 697c0c9e7d88fcfff27bfb46)"
 *     description: Returns the menu tree for Solutions section
 *     tags:
 *       - Homepage
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
 *           default: 12
 *         description: Number of items per page
 *       - in: query
 *         name: showHomePage
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Optional filter by showHomePage (true/false)
 *     responses:
 *       200:
 *         description: Solutions menu tree
 *       500:
 *         description: Server error
 */
router.get("/solutions", homepageController.getSolutionsMenus);

/**
 * @swagger
 * /api/homepage/insights:
 *   get:
 *     summary: "Get Insights menu tree (ID: 698191a46ea27a5d8ccbf724)"
 *     description: Returns the menu tree for Insights section
 *     tags:
 *       - Homepage
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
 *           default: 12
 *         description: Number of items per page
 *       - in: query
 *         name: showHomePage
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Optional filter by showHomePage (true/false)
 *       - in: query
 *         name: featuredInsights
 *         required: true
 *         schema:
 *           type: boolean
 *         description: Required filter by featuredInsights (true/false)
 *       - in: query
 *         name: caseStudies
 *         required: true
 *         schema:
 *           type: boolean
 *         description: Required filter by caseStudies (true/false)
 *       - in: query
 *         name: tag
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional filter by tagId
 *     responses:
 *       400:
 *         description: featuredInsights and caseStudies are required boolean query parameters
 *       200:
 *         description: Insights menu tree
 *       500:
 *         description: Server error
 */
router.get("/insights", homepageController.getInsightsMenus);

/**
 * @swagger
 * /api/homepage/industry:
 *   get:
 *     summary: "Get Industry menu tree (ID: 698aa02d84b05fe995a079a7)"
 *     description: Returns the menu tree for Industry section
 *     tags:
 *       - Homepage
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
 *           default: 12
 *         description: Number of items per page
 *       - in: query
 *         name: showHomePage
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Optional filter by showHomePage (true/false)
 *     responses:
 *       400:
 *         description: featuredInsights and caseStudies are required boolean query parameters
 *       200:
 *         description: Industry menu tree
 *       500:
 *         description: Server error
 */
router.get("/industry", homepageController.getIndustryMenus);

/**
 * @swagger
 * /api/homepage/menu-children-tree/{id}:
 *   get:
 *     summary: Get menu children tree by parent menu ID
 *     description: Returns all child menus for a given parent menu ID
 *     tags:
 *       - Homepage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent menu ID
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
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: tag
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional filter by tagId
 *     responses:
 *       200:
 *         description: Menu children tree
 *       404:
 *         description: Invalid ID format
 *       500:
 *         description: Server error
 */
router.get("/menu-children-tree/:id", homepageController.getMenuChildrenTree);

/**
 * @swagger
 * /api/homepage/detail/{id}:
 *   get:
 *     summary: Get detail groups by parent ID
 *     description: Returns all groups that belong to a specific parent menu, sorted by order
 *     tags:
 *       - Homepage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent menu ID
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
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of detail groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       videoShareList:
 *                         $ref: '#/components/schemas/VideoShareList'
 *       404:
 *         description: Invalid ID format
 *       500:
 *         description: Server error
 */
router.get("/detail/:id", homepageController.getDetail);

/**
 * @swagger
 * /api/homepage/related-posts/{id}:
 *   get:
 *     summary: Get related posts by current post ID
 *     description: Returns related posts for the selected article. Priority is same tag, then same parent category, excluding the current article.
 *     tags:
 *       - Homepage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Current post ID
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 3
 *         description: Maximum number of related posts returned
 *     responses:
 *       200:
 *         description: Related posts list
 *       404:
 *         description: Invalid ID format or post not found
 *       500:
 *         description: Server error
 */
router.get("/related-posts/:id", homepageController.getRelatedPosts);

/**
 * @swagger
 * /api/homepage/submit:
 *   post:
 *     summary: Submit homepage form (Talk to Expert, Get Quote, etc.)
 *     description: Public endpoint for submitting homepage forms without requiring formId. Uses formType to categorize submission.
 *     tags:
 *       - Homepage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               formType:
 *                 type: string
 *                 description: Form type/route (e.g., talk_to_expert, get_a_quote, contact)
 *               data:
 *                 type: object
 *                 description: Form submission data with field key-value pairs
 *                 example:
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   phone: "+84123456789"
 *                   message: "I need more information"
 *     responses:
 *       200:
 *         description: Form submission successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 submission:
 *                   type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
const formSubmissionController = require("../../form/controllers/submission.controllers");
router.post("/submit", formSubmissionController.submit);

module.exports = router;
