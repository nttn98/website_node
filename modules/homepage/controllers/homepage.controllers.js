const homepageService = require("../services/homepage.services");

/* ===== HOMEPAGE API CONTROLLERS ===== */

// Get all homepage data in one call
exports.getHomepageData = async (req, res) => {
  try {
    const [
      topMenus,
      bottomMenus,
      heroGroup,
      solutionsMenus,
      industryMenus,
      insightsMenus,
      socials,
    ] = await Promise.all([
      homepageService.getTopMenus(),
      homepageService.getBottomMenus(),
      homepageService.getHeroGroup(),
      homepageService.getSocials(),
    ]);

    res.json({
      success: true,
      data: {
        topMenus,
        bottomMenus,
        heroGroup,
        solutionsMenus,
        industryMenus,
        insightsMenus,
        socials,
      },
    });
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch homepage data",
    });
  }
};

// Get top menus only
exports.getTopMenus = async (req, res) => {
  try {
    const menus = await homepageService.getTopMenus();
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching top menus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top menus",
    });
  }
};

// Get bottom menus only
exports.getBottomMenus = async (req, res) => {
  try {
    const menus = await homepageService.getBottomMenus();
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching bottom menus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bottom menus",
    });
  }
};

// Get hero group
exports.getHeroGroup = async (req, res) => {
  try {
    const group = await homepageService.getHeroGroup();
    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("Error fetching hero group:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hero group",
    });
  }
};

// Get Solutions menus (ID: 697c0c9e7d88fcfff27bfb46)
exports.getSolutionsMenus = async (req, res) => {
  try {
    const menus = await homepageService.getMenuChildrenTree(
      "697c0c9e7d88fcfff27bfb46"
    );
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching solutions menus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch solutions menus",
    });
  }
};

// Get Industry menus (ID: 698aa02d84b05fe995a079a7)
exports.getIndustryMenus = async (req, res) => {
  try {
    const menus = await homepageService.getMenuChildrenTree(
      "698aa02d84b05fe995a079a7"
    );
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching industry menus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch industry menus",
    });
  }
};

// Get Insights menus (ID: 698191a46ea27a5d8ccbf724)
exports.getInsightsMenus = async (req, res) => {
  try {
    const menus = await homepageService.getMenuChildrenTree(
      "698191a46ea27a5d8ccbf724"
    );
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching insights menus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch insights menus",
    });
  }
};

// Get socials
exports.getSocials = async (req, res) => {
  try {
    const socials = await homepageService.getSocials();
    res.json({
      success: true,
      data: socials,
    });
  } catch (error) {
    console.error("Error fetching socials:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch socials",
    });
  }
};

// Get root menu parents
exports.getMenuParents = async (req, res) => {
  try {
    const menus = await homepageService.getMenuParents();
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching menu parents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu parents",
    });
  }
};

// Get menu children tree by parentId
exports.getMenuChildrenTree = async (req, res) => {
  const parentId = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(parentId)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  try {
    const menus = await homepageService.getMenuChildrenTree(parentId);
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching menu children tree:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu children tree",
    });
  }
};
