const Menu = require("../../menu/models/Menu");
const Group = require("../../group/models/Group");
const Social = require("../../social/models/Social");
const formService = require("../../form/services/form.services");

/* ===== HOMEPAGE API SERVICES ===== */

// Get top menus (root header menus shown on homepage)
exports.getTopMenus = () => {
  return Menu.find({
    type: "top",
    parentId: null,
    parentName: null,
    isActive: true,
    isStatus: true,
  })
    .sort({ order: 1 })
    .lean();
};

// Get bottom menus (footer menus shown on homepage)
exports.getBottomMenus = () => {
  return Menu.find({
    type: "bot",
    isActive: true,
    isStatus: true,
  })
    .sort({ order: 1 })
    .lean();
};

// Get hero group (group with ID 1 or first group for homepage)
exports.getHeroGroup = async () => {
  // Try to find group with specific criteria for hero section
  const group = await Group.findOne({
    parentId: null,
    parentName: null,
    isActive: true,
    isStatus: true,
  })
    .sort({ order: 1 })
    .lean();
  return group;
};

// Get menu children by parent name
exports.getMenusByParentName = async (parentName) => {
  // First find the parent menu by name (checking all language keys)
  const parentMenu = await Menu.findOne({
    $or: [
      { "title.en": parentName },
      { "title.vi": parentName },
      { "title.zh": parentName },
    ],
    isStatus: true,
    isActive: true,
  }).lean();

  if (!parentMenu) {
    return [];
  }

  // Get children of this parent
  return Menu.find({
    parentId: parentMenu._id,
    isActive: true,
    isStatus: true,
  })
    .sort({ order: 1 })
    .lean();
};

// Get all active socials
exports.getSocials = () => {
  return Social.find({
    isActive: true,
    isStatus: true,
  })
    .sort({ order: 1 })
    .lean();
};

// Get root menus (parents) for homepage
exports.getMenuParents = () => {
  return Menu.find({
    parentId: null,
    isActive: true,
    isStatus: true,
  })
    .sort({ order: 1 })
    .lean();
};

// Get menus for a given parentId with optional showHomePage/featuredInsights/tag filter
exports.getMenuChildrenTree = async (
  parentId,
  showHomePage,
  featuredInsights,
  tag
) => {
  const query = {
    isActive: true,
    isStatus: true,
    parentId: parentId,
  };

  if (typeof showHomePage === "boolean") {
    query.showHomePage = showHomePage;
  }

  if (typeof featuredInsights === "boolean") {
    query.featuredInsights = featuredInsights;
  }

  const normalizedTag = String(tag || "").trim();
  if (normalizedTag) {
    if (/^[a-fA-F0-9]{24}$/.test(normalizedTag)) {
      query.tagId = normalizedTag;
    } else {
      query.tagName = { $regex: normalizedTag, $options: "i" };
    }
  }

  const menus = await Menu.find(query).sort({ createdAt: -1, order: 1 }).lean();

  return menus.map((g) => ({
    ...g,
    route: null,
  }));
};

exports.getDetail = async (parentId) => {
  const groups = await Group.find({ isActive: true, isStatus: true }).lean();

  // Filter and map groups that have this parentId in their listParents
  let filteredGroups = groups
    .filter((g) => {
      if (g.listParents && Array.isArray(g.listParents)) {
        return g.listParents.some(
          (parent) => String(parent.parentId) === String(parentId)
        );
      }
      return false;
    })
    .map((g) => {
      // Find the matching parent entry to get order and parentName
      const parentEntry = g.listParents.find(
        (p) => String(p.parentId) === String(parentId)
      );

      return {
        _id: g._id,
        title: g.title,
        subTitle: g.subtitle,
        image: g.image,
        content: g.content || null,
        route: g.route || null,
        order: parentEntry?.order || 0,
        type: g.type,
        isStatus: g.isStatus,
        isActive: g.isActive,
        buttons: g.listButtons,
      };
    })
    .sort((a, b) => a.order - b.order);

  // Fetch form data for buttons with buttonFormId
  for (let group of filteredGroups) {
    if (group.buttons && Array.isArray(group.buttons)) {
      for (let button of group.buttons) {
        if (button.buttonFormId) {
          try {
            const form = await formService.getFormById(button.buttonFormId);
            button.form = form;
          } catch (error) {
            console.error(
              `Error fetching form for button ${button.buttonId}:`,
              error
            );
            button.form = null;
          }
        } else {
          button.form = null;
        }
      }
    }
  }

  return filteredGroups;
};
