const Menu = require("../../menu/models/Menu");
const Group = require("../../group/models/Group");
const Social = require("../../social/models/Social");

/* ===== HOMEPAGE API SERVICES ===== */

// Get top menus (root menus without parentId)
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

// Get bottom menus
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

// Get full menu tree for a given parentId
exports.getMenuChildrenTree = async (parentId) => {
  const menus = await Menu.find({
    isActive: true,
    isStatus: true,
    parentId: parentId,
  }).lean();

  return menus
    .map((g) => ({
      ...g,
      route: null,
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

exports.getDetail = async (parentId) => {
  const groups = await Group.find({ isActive: true, isStatus: true }).lean();

  // Filter and map groups that have this parentId in their listParents
  const filteredGroups = groups
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
        route: g.route || null,
        order: parentEntry?.order || 0,
        type: g.type,
        isStatus: g.isStatus,
        isActive: g.isActive,
        buttons: g.listButtons,
      };
    })
    .sort((a, b) => a.order - b.order);

  return filteredGroups;
};
