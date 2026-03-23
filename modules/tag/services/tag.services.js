const Tag = require("../models/Tag");

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.getAllTags = () => {
  return Tag.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

exports.getTagById = (id) => {
  return Tag.findById(id).lean();
};

exports.createTag = async (payload) => {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Name is required");
  }

  const slug = toSlug(payload.slug || name);
  const duplicate = await Tag.findOne({
    isActive: true,
    slug: { $regex: `^${escapeRegex(slug)}$`, $options: "i" },
  }).lean();

  if (duplicate) {
    throw new Error("Tag already exists");
  }

  const created = await Tag.create({
    name,
    slug,
    isStatus: true,
    isActive: true,
  });

  return created.toObject();
};

exports.updateTag = async (id, payload) => {
  const current = await Tag.findById(id).lean();
  if (!current || !current.isActive) {
    return null;
  }

  const update = {};

  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new Error("Name is required");
    }
    update.name = name;
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const nextSlug = toSlug(payload.slug || update.name || current.name);

    const duplicate = await Tag.findOne({
      _id: { $ne: id },
      isActive: true,
      slug: { $regex: `^${escapeRegex(nextSlug)}$`, $options: "i" },
    }).lean();

    if (duplicate) {
      throw new Error("Tag already exists");
    }

    update.slug = nextSlug;
  }

  return Tag.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
};

exports.deleteTag = async (id) => {
  await Tag.findByIdAndUpdate(id, { isActive: false, isStatus: false });
  return { success: true };
};

exports.toggleStatus = async (id) => {
  const tag = await Tag.findById(id).select("isStatus isActive").lean();
  if (!tag || !tag.isActive) {
    return null;
  }

  const nextStatus = !tag.isStatus;
  await Tag.updateOne({ _id: id }, { $set: { isStatus: nextStatus } });
  return { success: true, isStatus: nextStatus };
};
