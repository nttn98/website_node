const Menu = require("../../menu/models/Menu");
const Group = require("../../group/models/Group");
const Social = require("../../social/models/Social");
const formService = require("../../form/services/form.services");

const INSIGHTS_PARENT_ID = "698191a46ea27a5d8ccbf724";

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

// Get menus for a given parentId with optional filters
exports.getMenuChildrenTree = async (parentId, filters = {}, options = {}) => {
  const { showHomePage, featuredInsights, caseStudies, showFooter, tag } =
    filters;

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

  if (typeof caseStudies === "boolean") {
    query.caseStudies = caseStudies;
  }

  if (typeof showFooter === "boolean") {
    query.showFooter = showFooter;
  }

  const normalizedTag = String(tag || "").trim();
  if (normalizedTag) {
    if (/^[a-fA-F0-9]{24}$/.test(normalizedTag)) {
      query.tagId = normalizedTag;
    } else if (options.allowTagName === true) {
      query.tagName = { $regex: normalizedTag, $options: "i" };
    }
  }

  const menus = await Menu.find(query).sort({ order: 1 }).lean();

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
        videoShareList: Array.isArray(g.videoShareList) ? g.videoShareList : [],
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

exports.getRelatedPostsById = async (id, limit = 3) => {
  const currentPost = await Menu.findOne({
    _id: id,
    isActive: true,
    isStatus: true,
  }).lean();

  if (!currentPost) {
    return null;
  }

  const safeLimit = Math.max(Number(limit) || 3, 1);
  const resolvedParentId = currentPost.parentId
    ? currentPost.parentId
    : String(currentPost._id) === INSIGHTS_PARENT_ID
    ? currentPost._id
    : null;

  if (!resolvedParentId) {
    return [];
  }

  const baseQuery = {
    _id: { $ne: currentPost._id },
    isActive: true,
    isStatus: true,
    parentId: resolvedParentId,
  };

  const results = [];
  const seenIds = new Set();

  const appendUnique = (items) => {
    for (const item of items) {
      const itemId = String(item._id);
      if (seenIds.has(itemId)) {
        continue;
      }

      seenIds.add(itemId);
      results.push(item);

      if (results.length >= safeLimit) {
        break;
      }
    }
  };

  const hasTagId = /^[a-fA-F0-9]{24}$/.test(String(currentPost.tagId || ""));

  if (hasTagId) {
    return Menu.find({
      ...baseQuery,
      tagId: currentPost.tagId,
    })
      .sort({ createdAt: -1, order: 1 })
      .limit(safeLimit)
      .lean();
  }

  if (results.length < safeLimit) {
    const siblingPosts = await Menu.find(baseQuery)
      .sort({ createdAt: -1, order: 1 })
      .limit(safeLimit * 2)
      .lean();

    appendUnique(siblingPosts);
  }

  return results.slice(0, safeLimit);
};
