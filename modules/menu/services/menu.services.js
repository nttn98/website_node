const Menu = require("../models/Menu");
const path = require("path");

function invalidateMenuCache() {
  // No-op: menu list cache has been removed.
}

function normalizeTags(tagsInput) {
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof tagsInput === "string") {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/* ===== DASHBOARD ===== */

exports.getAllMenus = () => {
  return Menu.find({ isActive: true }).sort({ order: 1 }).lean();
};

exports.getAllMenusCached = async () => {
  return exports.getAllMenus();
};

exports.invalidateMenuCache = invalidateMenuCache;

exports.getMenuChildren = (parentId) => {
  return Menu.find({ parentId, isActive: true }).sort({ order: 1 }).lean();
};

// Get full descendants tree by parentId
exports.getMenuChildrenTree = async (parentId) => {
  const menus = await Menu.find({ isActive: true }).sort({ order: 1 }).lean();
  const byParent = new Map();
  menus.forEach((m) => {
    const key = m.parentId ? String(m.parentId) : "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(m);
  });

  const build = (pid) => {
    const key = pid ? String(pid) : "root";
    const items = byParent.get(key) || [];
    return items.map((item) => ({
      ...item,
      children: build(item._id),
    }));
  };

  return build(parentId);
};

exports.getMenuById = (id) => {
  return Menu.findById(id).lean();
};

exports.createMenu = async (data) => {
  let parentName = null;
  if (data.parentId) {
    const parentMenu = await Menu.findById(data.parentId).lean();
    if (parentMenu)
      parentName = parentMenu.title?.en || parentMenu.title || null;
  }

  const tags = normalizeTags(data.tags);

  // Handle image path normalization
  let image = "";
  if (typeof data.image === "string" && data.image) {
    image = data.image;
    // Normalize image path
    image = image.replace(/\\/g, "/");
    image = image.replace(/^(?:\/+|(?:\.\.\/)+)/g, "");
    if (path.isAbsolute(image)) {
      image =
        "/" +
        path
          .relative(path.join(__dirname, "../../../public"), image)
          .replace(/\\/g, "/");
    } else {
      image = "/" + image.replace(/^\/+/, "");
    }
  }

  const menu = await Menu.create({
    title: new Map([
      ["en", data.title_en || data.title || ""],
      ["vi", data.title_vi || data.title || ""],
      ["zh", data.title_zh || data.title || ""],
    ]),
    // subtitle support (subTitle)
    subTitle: new Map([
      ["en", data.subtitle_en || data.subtitle || ""],
      ["vi", data.subtitle_vi || data.subtitle || ""],
      ["zh", data.subtitle_zh || data.subtitle || ""],
    ]),
    route: data.route || null,
    parentId: data.parentId || null,
    parentName,
    order: Number(data.order) || 0,
    type: data.type || "top",
    isButton: data.isButton === "on" || data.isButton === true,
    // Only set showHomePage to true if menu has a parent
    showHomePage:
      (data.parentId &&
        (data.showHomePage === "on" ||
          data.showHomePage === "true" ||
          data.showHomePage === true)) ||
      false,
    image: image,
    tags,
    isStatus: true,
    isActive: true,
  });
  invalidateMenuCache();
  return menu.toObject();
};

exports.updateMenu = async (id, data) => {
  let parentName = null;
  const currentMenu = await Menu.findById(id).lean();
  const finalParentId =
    data.parentId !== undefined ? data.parentId : currentMenu.parentId;

  if (data.parentId) {
    const parentMenu = await Menu.findById(data.parentId).lean();
    if (parentMenu)
      parentName = parentMenu.title?.en || parentMenu.title || null;
  }

  const update = {};

  // Only update fields that are provided
  if (data.route !== undefined) update.route = data.route || null;
  if (data.parentId !== undefined) update.parentId = data.parentId || null;
  parentName;
  if (data.order !== undefined) update.order = Number(data.order) || 0;
  if (data.type !== undefined) update.type = data.type;
  if (data.isButton !== undefined)
    update.isButton = data.isButton === "on" || data.isButton === true;
  if (data.showHomePage !== undefined) {
    // Only set showHomePage to true if menu has a parent
    update.showHomePage =
      (finalParentId &&
        (data.showHomePage === "on" ||
          data.showHomePage === "true" ||
          data.showHomePage === true)) ||
      false;
  }

  if (data.tags !== undefined) {
    update.tags = normalizeTags(data.tags);
  }

  // Handle image path normalization
  if (data.image !== undefined) {
    let image = "";
    if (typeof data.image === "string" && data.image) {
      image = data.image;
      image = image.replace(/\\/g, "/");
      image = image.replace(/^(?:\/+|(?:\.\.\/)+)/g, "");
      if (path.isAbsolute(image)) {
        image =
          "/" +
          path
            .relative(path.join(__dirname, "../../../public"), image)
            .replace(/\\/g, "/");
      } else {
        image = "/" + image.replace(/^\/+/, "");
      }
    }
    update.image = image;
  }

  // Multi-language title support
  if (data.title_en) update["title.en"] = data.title_en;
  if (data.title_vi) update["title.vi"] = data.title_vi;
  if (data.title_zh) update["title.zh"] = data.title_zh;

  // Subtitle (subTitle) support
  if (data.subtitle_en !== undefined) update["subTitle.en"] = data.subtitle_en;
  if (data.subtitle_vi !== undefined) update["subTitle.vi"] = data.subtitle_vi;
  if (data.subtitle_zh !== undefined) update["subTitle.zh"] = data.subtitle_zh;

  const updated = await Menu.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  invalidateMenuCache();
  return updated;
};

exports.deleteMenu = async (id) => {
  await Menu.findByIdAndUpdate(id, {
    isActive: false,
    isStatus: false,
  });
  invalidateMenuCache();
  return { success: true };
};

exports.toggleMenu = async (id) => {
  const menu = await Menu.findById(id);
  menu.isStatus = !menu.isStatus;
  await menu.save();
  invalidateMenuCache();
  return { success: true, isStatus: menu.isStatus };
};

exports.toggleShowHomePage = async (id) => {
  const menu = await Menu.findById(id);
  if (!menu) {
    throw new Error("Menu not found");
  }
  // Only allow toggle if menu has a parent
  if (!menu.parentId) {
    throw new Error("Only non-root menus can be shown on homepage");
  }
  menu.showHomePage = !menu.showHomePage;
  const updatedMenu = await menu.save();
  invalidateMenuCache();
  return updatedMenu.toObject ? updatedMenu.toObject() : updatedMenu;
};
