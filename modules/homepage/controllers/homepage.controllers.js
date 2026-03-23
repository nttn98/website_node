const homepageService = require("../services/homepage.services");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

/* ===== HOMEPAGE API CONTROLLERS ===== */

function parseOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function sortByCreatedAtDesc(items) {
  const list = Array.isArray(items) ? items : [];
  return [...list].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
  );
}

// Get all homepage data in one call
exports.getHomepageData = async (req, res) => {
  try {
    const menuLimitParams = getPaginationParams(
      { query: { page: 1, limit: req.query.menuLimit } },
      { defaultLimit: 8, maxLimit: 50, force: true }
    );

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
      homepageService.getMenuChildrenTree("697c0c9e7d88fcfff27bfb46"),
      homepageService.getMenuChildrenTree("698aa02d84b05fe995a079a7"),
      homepageService.getMenuChildrenTree("698191a46ea27a5d8ccbf724"),
      homepageService.getSocials(),
    ]);

    const solutions = paginateArray(solutionsMenus, menuLimitParams);
    const industry = paginateArray(industryMenus, menuLimitParams);
    const insights = paginateArray(
      [...insightsMenus].sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      ),
      menuLimitParams
    );

    res.json({
      success: true,
      data: {
        topMenus,
        bottomMenus,
        heroGroup,
        solutionsMenus: solutions.items,
        industryMenus: industry.items,
        insightsMenus: insights.items,
        socials,
      },
      pagination: {
        menuLimit: menuLimitParams.limit,
        solutionsMenus: solutions.pagination,
        industryMenus: industry.pagination,
        insightsMenus: insights.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 20,
      maxLimit: 100,
    });
    const menus = await homepageService.getTopMenus();
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 30,
      maxLimit: 200,
    });
    const menus = await homepageService.getBottomMenus();
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 12,
      maxLimit: 100,
    });
    const showHomePage = parseOptionalBoolean(req.query.showHomePage);
    const menus = await homepageService.getMenuChildrenTree(
      "697c0c9e7d88fcfff27bfb46",
      showHomePage
    );
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 12,
      maxLimit: 100,
    });
    const showHomePage = parseOptionalBoolean(req.query.showHomePage);
    const menus = await homepageService.getMenuChildrenTree(
      "698aa02d84b05fe995a079a7",
      showHomePage
    );
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 12,
      maxLimit: 100,
    });
    const showHomePage = parseOptionalBoolean(req.query.showHomePage);
    const featuredInsights = parseOptionalBoolean(req.query.featuredInsights);
    const menus = await homepageService.getMenuChildrenTree(
      "698191a46ea27a5d8ccbf724",
      showHomePage,
      featuredInsights
    );
    const paged = paginateArray(
      [...menus].sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      ),
      params
    );
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 20,
      maxLimit: 100,
    });
    const socials = await homepageService.getSocials();
    const paged = paginateArray(socials, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 20,
      maxLimit: 100,
    });
    const menus = await homepageService.getMenuParents();
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
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
    const params = getPaginationParams(req, {
      defaultLimit: 20,
      maxLimit: 200,
    });
    const menus = await homepageService.getMenuChildrenTree(parentId);
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
    });
  } catch (error) {
    console.error("Error fetching menu children tree:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu children tree",
    });
  }
};

// Get detail groups by parentId
exports.getDetail = async (req, res) => {
  const parentId = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(parentId)) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid ID format" });
  }
  try {
    const params = getPaginationParams(req, {
      defaultLimit: 20,
      maxLimit: 200,
    });
    const groups = await homepageService.getDetail(parentId);
    const paged = paginateArray(groups, params);
    res.json({
      success: true,
      data: paged.items,
      pagination: paged.pagination,
    });
  } catch (error) {
    console.error("Error fetching detail groups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch detail groups",
    });
  }
};
