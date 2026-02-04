const menuService = require("../../menu/services/menu.service");
const groupService = require("../services/group.service");

exports.toggleStatus = async (req, res) => {
  const group = await groupService.toggleStatus(req.params.id);
  res.json({ success: true, isStatus: group.isStatus });
};

/* ===== LIST ===== */
exports.index = async (req, res) => {
  const groups = await groupService.getAllGroupsSorted();
  const menuId = req.query.menuId || req.params.menuId;
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
    return res.json({ groups: filteredGroups });
  }
  res.json({ groups });
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
  // Chuẩn hóa images
  let images = [];
  if (typeof req.body.images === "string") {
    try {
      images = JSON.parse(req.body.images);
    } catch {
      images = [];
    }
  } else if (Array.isArray(req.body.images)) images = req.body.images;
  else if (req.file) images = [`/uploads/groups/${req.file.filename}`];
  else if (req.body.image) images = [req.body.image];
  // Chuẩn hóa listButtons
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
    images,
    listButtons,
  });
  res.status(201).json({ success: true, group: created });
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
  // Chuẩn hóa listParents
  let listParents = [];
  if (Array.isArray(req.body.listParents)) {
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
  // Chuẩn hóa images
  let images = [];
  if (Array.isArray(req.body.images)) images = req.body.images;
  else if (req.file) images = [`/uploads/groups/${req.file.filename}`];
  else if (req.body.image) images = [req.body.image];
  // Chuẩn hóa listButtons
  let listButtons = Array.isArray(req.body.listButtons)
    ? req.body.listButtons
    : [];
  const updated = await groupService.updateGroup(req.params.id, {
    ...req.body,
    listParents,
    images,
    listButtons,
  });
  res.json({ success: true, group: updated });
};

/* ===== DELETE ===== */
exports.delete = async (req, res) => {
  await groupService.deleteGroup(req.params.id);
  res.json({ success: true });
};

exports.update = async (req, res) => {
  const updated = await groupService.updateGroup(
    req.params.id,
    req.body,
    req.files
  );
  res.json({ success: true, group: updated });
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
  // Nếu menuId không phải ObjectId hợp lệ thì trả về 404
  if (!/^[a-fA-F0-9]{24}$/.test(menuId)) {
    return res.status(404).send("Not found");
  }
  const groups = await groupService.getGroupsByParent(menuId);
  res.json({ success: true, menuId, groups });
};
