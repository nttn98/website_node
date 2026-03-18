const socialService = require("../services/social.services");
const menuService = require("../../menu/services/menu.services");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

exports.getPublic = async (req, res) => {
  try {
    const params = getPaginationParams(req, {
      defaultLimit: 5,
      maxLimit: 100,
    });
    let items = await socialService.getPublicItems();
    const searchTerm = (req.query.search || "").trim().toLowerCase();

    // Apply search filter if provided
    if (searchTerm) {
      items = items.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(searchTerm) ||
          (item.url || "").toLowerCase().includes(searchTerm)
      );
    }

    const paged = paginateArray(items, params);
    res.json({
      success: true,
      items: paged.items,
      pagination: paged.pagination,
    });
  } catch (err) {
    console.error("Get social items failed", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Admin update (API)
exports.update = async (req, res) => {
  try {
    const doc = await socialService.update(req.body);
    res.json({ success: true, social: doc });
  } catch (err) {
    console.error("Update social failed", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Dashboard edit form (render)
exports.editForm = async (req, res) => {
  try {
    const items = await socialService.getAllItems();
    res.locals.menus = await menuService.getAllMenus();
    res.locals.currentPage = "socials";
    // allow optional editId param so the create/edit page can focus a row
    const editId = req.query.editId || null;
    res.render("dashboard/socials/edit", { social: { items }, editId });
  } catch (err) {
    console.error("Load social edit failed", err);
    res.status(500).send("Server error");
  }
};

// Dashboard index page
exports.indexPage = async (req, res) => {
  try {
    // default creation removed; avoid creating duplicates from requests
    res.locals.menus = await menuService.getAllMenus();
    res.locals.currentPage = "socials";
    res.render("dashboard/socials/index");
  } catch (err) {
    console.error("Load social index failed", err);
    res.status(500).send("Server error");
  }
};

// Dashboard update (form submit) - alternative path if using server-side form
exports.updateFromDashboard = async (req, res) => {
  try {
    const { id, name, url, iconClass, order, isActive, isStatus } = req.body;
    // Build items from arrays
    const ids = Array.isArray(id) ? id : id ? [id] : [];
    const names = Array.isArray(name) ? name : name ? [name] : [];
    const urls = Array.isArray(url) ? url : url ? [url] : [];
    const icons = Array.isArray(iconClass)
      ? iconClass
      : iconClass
      ? [iconClass]
      : [];
    const orders = Array.isArray(order) ? order : order ? [order] : [];
    const actives = Array.isArray(isActive)
      ? isActive
      : isActive
      ? [isActive]
      : [];
    const statuses = Array.isArray(isStatus)
      ? isStatus
      : isStatus
      ? [isStatus]
      : [];

    const items = names
      .map((n, i) => ({
        _id: ids[i] || undefined,
        name: n ? String(n).trim() : "",
        iconClass: icons[i] || "",
        url: urls[i] || "",
        order: Number(orders[i] || 0),
        isStatus:
          statuses[i] === "on" ||
          statuses[i] === "true" ||
          statuses[i] === true,
        isActive:
          actives[i] === "on" || actives[i] === "true" || actives[i] === true,
      }))
      .filter((it) => it._id || it.name);

    await socialService.update({ items });
    res.redirect("/dashboard/socials");
  } catch (err) {
    console.error("Dashboard update failed", err);
    res.redirect("/dashboard/socials");
  }
};

// Toggle a single item's visible status
exports.toggleItemStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await socialService.toggleStatus(id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, isStatus: item.isStatus });
  } catch (err) {
    console.error("Toggle item status failed", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Toggle a single item's active (soft delete / restore)
exports.toggleItemActive = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await socialService.toggleActive(id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, isActive: item.isActive });
  } catch (err) {
    console.error("Toggle item active failed", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};
