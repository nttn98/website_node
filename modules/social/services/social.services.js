const Social = require("../models/Social");

// Helper to safely build case-insensitive regex queries
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Create new social item with default values (prevent duplicates)
exports.create = async (payload) => {
  const name = String(payload.name || "").trim();
  const url = String(payload.url || "").trim();
  const iconClass = String(payload.iconClass || "").trim();

  if (!name && !url) {
    throw new Error("Name or URL is required to create a social item");
  }

  // Build duplicate query (case-insensitive match)
  const query = { isActive: true };
  if (name) query.name = { $regex: `^${escapeRegex(name)}$`, $options: "i" };
  if (url) query.url = { $regex: `^${escapeRegex(url)}$`, $options: "i" };

  const existing = await Social.findOne(query);
  if (existing) return existing;

  const newItem = await Social.create({
    name,
    iconClass,
    url,
    order: Number(payload.order || 0),
    isStatus: true,
    isActive: true,
  });
  return newItem;
};

exports.getPublicItems = async () => {
  return await Social.find({ isActive: true, isStatus: true }).sort({
    order: 1,
  });
};

exports.getAllItems = async () => {
  return await Social.find({ isActive: true }).sort({ order: 1 });
};

// Create or update social items
exports.update = async (payload) => {
  const incoming = payload.items || [];
  const results = [];

  for (const item of incoming) {
    if (item._id) {
      // Update existing item: only set fields provided to avoid overwriting with blanks during reorder
      const updateData = {};
      if (item.name !== undefined)
        updateData.name = String(item.name || "").trim();
      if (item.iconClass !== undefined)
        updateData.iconClass = String(item.iconClass || "").trim();
      if (item.url !== undefined)
        updateData.url = String(item.url || "").trim();
      if (item.order !== undefined) updateData.order = Number(item.order);
      if (item.isStatus !== undefined)
        updateData.isStatus = Boolean(item.isStatus);
      if (item.isActive !== undefined)
        updateData.isActive = Boolean(item.isActive);

      const updated = await Social.findByIdAndUpdate(item._id, updateData, {
        new: true,
      });
      if (updated) results.push(updated);
    } else {
      // Create new item: always default isStatus/isActive to true to prevent accidental false values
      const newItem = await Social.create({
        name: String(item.name || "").trim(),
        iconClass: String(item.iconClass || "").trim(),
        url: String(item.url || "").trim(),
        order: Number(item.order || 0),
        isStatus: true,
        isActive: true,
      });
      results.push(newItem);
    }
  }

  return { items: results };
};

// Delete item by setting isActive to false
exports.deleteItem = async (id) => {
  return await Social.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

// Toggle status of item
exports.toggleStatus = async (id) => {
  const item = await Social.findById(id);
  if (!item) return null;
  item.isStatus = !item.isStatus;
  return await item.save();
};

// Toggle active status of item
exports.toggleActive = async (id) => {
  const item = await Social.findById(id);
  if (!item) return null;
  item.isActive = !item.isActive;
  return await item.save();
};
