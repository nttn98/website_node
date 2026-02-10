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
