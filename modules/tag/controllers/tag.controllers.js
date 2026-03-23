const tagService = require("../services/tag.services");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

exports.getAllTags = async (req, res) => {
  const params = getPaginationParams(req, { defaultLimit: 50, maxLimit: 300 });
  let tags = await tagService.getAllTags();
  const searchTerm = (req.query.search || "").trim().toLowerCase();

  if (searchTerm) {
    tags = tags.filter(
      (tag) =>
        (tag.name || "").toLowerCase().includes(searchTerm) ||
        (tag.slug || "").toLowerCase().includes(searchTerm)
    );
  }

  const paged = paginateArray(tags, params);
  res.json({ success: true, data: paged.items, pagination: paged.pagination });
};

exports.getTagById = async (req, res) => {
  const tag = await tagService.getTagById(req.params.id);
  if (!tag || !tag.isActive) {
    return res.status(404).json({ success: false, message: "Tag not found" });
  }

  res.json({ success: true, data: tag });
};

exports.createTag = async (req, res) => {
  try {
    const tag = await tagService.createTag(req.body || {});
    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    const status =
      err.message === "Name is required" || err.message === "Tag already exists"
        ? 400
        : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const tag = await tagService.updateTag(req.params.id, req.body || {});
    if (!tag || !tag.isActive) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    res.json({ success: true, data: tag });
  } catch (err) {
    const status =
      err.message === "Name is required" || err.message === "Tag already exists"
        ? 400
        : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

exports.deleteTag = async (req, res) => {
  await tagService.deleteTag(req.params.id);
  res.json({ success: true });
};

exports.toggleStatus = async (req, res) => {
  const result = await tagService.toggleStatus(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Tag not found" });
  }

  res.json(result);
};
