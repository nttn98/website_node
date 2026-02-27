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
 *     responses:
 *       200:
 *         description: All homepage data
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
 *     responses:
 *       200:
 *         description: List of root menus
 *       500:
 *         description: Server error
 */
router.get("/menu-parents", homepageController.getMenuParents);

/**
 * @swagger
 * /api/homepage/menus/{id}/children-tree:
 *   get:
 *     summary: Get menu children tree by parentId (for homepage)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của menu cha
 *     tags:
 *       - Homepage
 *     responses:
 *       200:
 *         description: Menu tree
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.get("/menus/:id/children-tree", homepageController.getMenuChildrenTree);

/**
 * @swagger
 * /api/homepage/solutions:
 *   get:
 *     summary: "Get Solutions menu tree (ID: 697c0c9e7d88fcfff27bfb46)"
 *     description: Returns the menu tree for Solutions section
 *     tags:
 *       - Homepage
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
 *     responses:
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
 *     responses:
 *       200:
 *         description: Industry menu tree
 *       500:
 *         description: Server error
 */
router.get("/industry", homepageController.getIndustryMenus);

module.exports = router;
