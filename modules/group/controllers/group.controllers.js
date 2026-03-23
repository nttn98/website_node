const menuService = require("../../menu/services/menu.services");
const groupService = require("../services/group.services");
const path = require("path");
const {
  removeUnusedContentImages,
  validateContentImageSources,
} = require("../../../utils/content-images");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

function extractHost(value) {
  const input = String(value || "").trim();
  if (!input) return "";

  if (/^https?:\/\//i.test(input)) {
    try {
      return (new URL(input).host || "").toLowerCase();
    } catch {
      return "";
    }
  }

  return input.split(",")[0].trim().toLowerCase();
}

function resolveAllowedImageHosts(req) {
  const candidates = [
    process.env.PUBLIC_BASE_URL,
    req.headers["x-forwarded-host"],
    req.headers["x-original-host"],
    req.headers.origin,
    req.get("host"),
  ];

  return [...new Set(candidates.map(extractHost).filter(Boolean))];
}

exports.toggleStatus = async (req, res) => {
  const group = await groupService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: group.isStatus });
};

/* ===== LIST ===== */
exports.index = async (req, res) => {
  const params = getPaginationParams(req, { defaultLimit: 5, maxLimit: 300 });
  let groups = await groupService.getAllGroupsSorted();
  const menuId = req.query.menuId || req.params.menuId;
  const searchTerm = (req.query.search || "").trim().toLowerCase();

  // Apply menuId filter if provided
  if (menuId) {
    // Filter groups that have the menuId in listParents
    const filteredGroups = groups.filter(
      (group) =>
        Array.isArray(group.listParents) &&
        group.listParents.some(
          (parent) => parent.parentId.toString() === menuId
        )
    );
    // Sort by order in listParents
    filteredGroups.sort((a, b) => {
      const aOrder =
        a.listParents.find((p) => p.parentId.toString() === menuId)?.order || 0;
      const bOrder =
        b.listParents.find((p) => p.parentId.toString() === menuId)?.order || 0;
      return aOrder - bOrder;
    });
    groups = filteredGroups;
  }

  // Apply search filter if provided
  if (searchTerm) {
    groups = groups.filter(
      (group) =>
        (group.title?.en || "").toLowerCase().includes(searchTerm) ||
        (group.subtitle?.en || "").toLowerCase().includes(searchTerm) ||
        (group.title?.vi || "").toLowerCase().includes(searchTerm) ||
        (group.subtitle?.vi || "").toLowerCase().includes(searchTerm)
    );
  }

  const paged = paginateArray(groups, params);
  res.json({ groups: paged.items, pagination: paged.pagination });
};

/* ===== GET NEXT ORDER ===== */
exports.getNextOrder = async (req, res) => {
  const menuId = req.params.menuId;
  const groups = await groupService.getAllGroupsSorted();
  const filteredGroups = groups.filter(
    (group) =>
      Array.isArray(group.listParents) &&
      group.listParents.some((parent) => parent.parentId.toString() === menuId)
  );
  const maxOrder =
    filteredGroups.length > 0
      ? Math.max(
          ...filteredGroups.map(
            (g) =>
              g.listParents.find((p) => p.parentId.toString() === menuId)
                ?.order || 0
          )
        )
      : 0;
  res.json({ nextOrder: maxOrder + 1 });
};

/* ===== CREATE ===== */
exports.createForm = async (req, res) => {
  const menus = await menuService.getAllMenus();
  res.locals.menus = menus;
  res.render("groups/create");
};

exports.create = async (req, res) => {
  try {
    const contentForValidation = String(req.body.content || "");
    const contentImageCheck = validateContentImageSources(
      contentForValidation,
      {
        allowedHosts: resolveAllowedImageHosts(req),
      }
    );
    if (!contentImageCheck.isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Content contains image/PDF source(s) not hosted on this server. Please upload & replace before saving.",
        invalidImageSources: contentImageCheck.invalidSources,
      });
    }

    // Chỉ lấy listParents từ form (không cần menuId)
    let listParents = [];
    if (typeof req.body.listParents === "string") {
      try {
        listParents = JSON.parse(req.body.listParents);
      } catch {
        listParents = [];
      }
    } else if (Array.isArray(req.body.listParents)) {
      listParents = req.body.listParents;
    }
    // image
    let image = "";
    if (typeof req.body.image === "string" && req.body.image) {
      image = req.body.image;
    } else if (req.file) {
      image =
        "/uploads/groups/" +
        (req.file.filename || path.basename(req.file.path));
    }
    // listButtons
    let listButtons = [];
    if (typeof req.body.listButtons === "string") {
      try {
        listButtons = JSON.parse(req.body.listButtons);
      } catch {
        listButtons = [];
      }
    } else if (Array.isArray(req.body.listButtons)) {
      listButtons = req.body.listButtons;
    }

    const created = await groupService.createGroup({
      ...req.body,
      listParents,
      image,
      listButtons,
    });
    res.status(201).json({ success: true, group: created });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

/* ===== EDIT ===== */
exports.editForm = async (req, res) => {
  const group = await groupService.getGroupDocById(req.params.id);
  const menus = await menuService.getAllMenus();

  res.locals.menus = menus;
  // Set currentMenuId from first parent if available
  res.locals.currentMenuId =
    Array.isArray(group.listParents) && group.listParents.length
      ? group.listParents[0].parentId.toString()
      : undefined;

  res.render("dashboard/groups/edit", { group, menus });
};

exports.update = async (req, res) => {
  try {
    const contentForValidation = String(req.body.content || "");
    const contentImageCheck = validateContentImageSources(
      contentForValidation,
      {
        allowedHosts: resolveAllowedImageHosts(req),
      }
    );
    if (!contentImageCheck.isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Content contains image/PDF source(s) not hosted on this server. Please upload & replace before updating.",
        invalidImageSources: contentImageCheck.invalidSources,
      });
    }

    const previousGroup = await groupService.getGroupById(req.params.id);

    // listParents (only set if provided)
    let listParents;
    if (typeof req.body.listParents === "string") {
      try {
        listParents = JSON.parse(req.body.listParents);
      } catch {
        listParents = [];
      }
    } else if (Array.isArray(req.body.listParents)) {
      listParents = req.body.listParents;
    } else if (req.body.parentId && req.body.parentName) {
      listParents = [
        { parentId: req.body.parentId, parentName: req.body.parentName },
      ];
    } else if (req.body.parentId) {
      const menu = await menuService.getMenuById(req.body.parentId);
      listParents = [
        { parentId: req.body.parentId, parentName: menu?.title?.en || "" },
      ];
    }
    // image (only set if provided)
    let image;
    if (typeof req.body.image === "string" && req.body.image) {
      image = req.body.image;
    } else if (req.file) {
      image =
        "/" +
        path
          .relative(path.join(__dirname, "../../../public"), req.file.path)
          .replace(/\\/g, "/");
    }

    // listButtons (only include if provided)
    let listButtons;
    if (typeof req.body.listButtons === "string") {
      try {
        listButtons = JSON.parse(req.body.listButtons);
      } catch {
        listButtons = [];
      }
    } else if (Array.isArray(req.body.listButtons)) {
      listButtons = req.body.listButtons;
    } else {
      listButtons = undefined; // not provided => do not change
    }
    // console.log("Group update - incoming listButtons:", listButtons);

    const payload = { ...req.body };
    if (listParents !== undefined) payload.listParents = listParents;
    if (image !== undefined) payload.image = image;
    if (listButtons !== undefined) payload.listButtons = listButtons;

    const updated = await groupService.updateGroup(req.params.id, payload);

    if (previousGroup && typeof payload.content === "string") {
      await removeUnusedContentImages(previousGroup.content, updated?.content);
    }

    res.json({ success: true, group: updated });
  } catch (err) {
    console.error("Group update failed", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

/* ===== DELETE ===== */
exports.delete = async (req, res) => {
  await groupService.deleteGroup(req.params.id);
  res.json({ success: true });
};

/* ===== UPDATE ORDER ===== */
exports.updateOrder = async (req, res) => {
  const { parentId, order } = req.body;
  const group = await groupService.getGroupById(req.params.id);
  const parent = group.listParents.find(
    (p) => p.parentId.toString() === parentId
  );
  if (parent) {
    parent.order = order;
    await group.save();
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: "Parent not found" });
  }
};

/* ===== UPDATE ORDERS ===== */
exports.updateOrders = async (req, res) => {
  const { updates, parentId } = req.body;
  for (const { groupId, order } of updates) {
    const group = await groupService.getGroupDocById(groupId);
    const parent = group.listParents.find(
      (p) => p.parentId.toString() === parentId
    );
    if (parent) {
      parent.order = order;
      await group.save();
    }
  }
  res.json({ success: true });
};

exports.showGroupByMenu = async (req, res) => {
  const menuId = req.params.menuId;
  const params = getPaginationParams(req, { defaultLimit: 30, maxLimit: 300 });
  // Nếu menuId không phải ObjectId hợp lệ thì trả về 404
  if (!/^[a-fA-F0-9]{24}$/.test(menuId)) {
    return res.status(404).send("Not found");
  }
  const groups = await groupService.getGroupsByParent(menuId);
  const paged = paginateArray(groups, params);
  res.json({
    success: true,
    menuId,
    groups: paged.items,
    pagination: paged.pagination,
  });
};

exports.getById = async (req, res) => {
  const id = req.params.id;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  const group = await groupService.getGroupById(id);
  if (!group)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, group });
};
