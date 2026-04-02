const Tag = require("../models/Tag");
const mongoose = require("mongoose");
const Menu = require("../../menu/models/Menu");
const Group = require("../../group/models/Group");

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

function normalizeTargetType(value) {
  const normalized = String(value || "menu")
    .trim()
    .toLowerCase();
  if (normalized !== "menu" && normalized !== "group") {
    throw new Error("Target type is invalid");
  }
  return normalized;
}

function getGlobalSpecificName(targetType) {
  return targetType === "group" ? "All groups" : "All menus";
}

function buildTargetKey(target) {
  const targetType = normalizeTargetType(target?.targetType || "menu");
  const specificId = String(target?.specificId || "").trim();
  return `${targetType}:${specificId}`;
}

function normalizeStoredTargets(tag) {
  const rawTargets = Array.isArray(tag?.specificTargets) ? tag.specificTargets : [];

  if (rawTargets.length) {
    const unique = new Map();
    rawTargets.forEach((target) => {
      const normalizedTargetType = normalizeTargetType(target?.targetType || "menu");
      const specificId = target?.specificId ? String(target.specificId).trim() : "";
      const key = `${normalizedTargetType}:${specificId}`;
      unique.set(key, {
        targetType: normalizedTargetType,
        specificId: specificId || null,
        specificName: String(target?.specificName || getGlobalSpecificName(normalizedTargetType)).trim(),
      });
    });
    return Array.from(unique.values()).sort((left, right) =>
      buildTargetKey(left).localeCompare(buildTargetKey(right))
    );
  }

  const legacyTargetType = normalizeTargetType(tag?.targetType || "menu");
  const legacySpecificId = tag?.specificId ? String(tag.specificId).trim() : "";
  return [
    {
      targetType: legacyTargetType,
      specificId: legacySpecificId || null,
      specificName: String(
        tag?.specificName || getGlobalSpecificName(legacyTargetType)
      ).trim(),
    },
  ];
}

function readSpecificSelections(payload) {
  if (Array.isArray(payload?.specificTargets)) {
    return payload.specificTargets;
  }

  if (typeof payload?.specificTargets === "string") {
    try {
      const parsed = JSON.parse(payload.specificTargets);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [payload.specificTargets];
    }
  }

  if (payload?.targetType !== undefined || payload?.specificId !== undefined) {
    const targetType = normalizeTargetType(payload?.targetType || "menu");
    return [{ targetType, specificId: payload?.specificId || "" }];
  }

  return [];
}

function parseSpecificSelection(selection) {
  if (selection && typeof selection === "object" && !Array.isArray(selection)) {
    return {
      targetType: normalizeTargetType(selection.targetType || "menu"),
      specificId: String(selection.specificId || "").trim(),
    };
  }

  const [rawType, ...rest] = String(selection || "menu:").split(":");
  return {
    targetType: normalizeTargetType(rawType || "menu"),
    specificId: rest.join(":").trim(),
  };
}

async function resolveSpecificTargets(payload) {
  const selections = readSpecificSelections(payload);
  if (!selections.length) {
    return [
      {
        targetType: "menu",
        specificId: null,
        specificName: getGlobalSpecificName("menu"),
      },
    ];
  }

  const uniqueSelections = [];
  const seen = new Set();

  for (const selection of selections) {
    const parsed = parseSpecificSelection(selection);
    const key = `${parsed.targetType}:${parsed.specificId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSelections.push(parsed);
  }

  const menuIds = uniqueSelections
    .filter((item) => item.targetType === "menu" && item.specificId)
    .map((item) => item.specificId);
  const groupIds = uniqueSelections
    .filter((item) => item.targetType === "group" && item.specificId)
    .map((item) => item.specificId);

  if (
    menuIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
    groupIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
  ) {
    throw new Error("Specific target is invalid");
  }

  const [menus, groups] = await Promise.all([
    menuIds.length
      ? Menu.find({ _id: { $in: menuIds }, isActive: true }).select("_id title").lean()
      : [],
    groupIds.length
      ? Group.find({ _id: { $in: groupIds }, isActive: true }).select("_id title").lean()
      : [],
  ]);

  const menuMap = new Map(
    menus.map((menu) => [String(menu._id), String(menu.title?.en || menu.title || "").trim()])
  );
  const groupMap = new Map(
    groups.map((group) => [String(group._id), String(group.title?.en || group.title || "").trim()])
  );

  return uniqueSelections.map((item) => {
    if (!item.specificId) {
      return {
        targetType: item.targetType,
        specificId: null,
        specificName: getGlobalSpecificName(item.targetType),
      };
    }

    const specificName =
      item.targetType === "menu"
        ? menuMap.get(item.specificId)
        : groupMap.get(item.specificId);

    if (!specificName) {
      throw new Error("Specific target is invalid");
    }

    return {
      targetType: item.targetType,
      specificId: item.specificId,
      specificName,
    };
  });
}

function tagMatchesTargetType(tag, targetType) {
  const targets = normalizeStoredTargets(tag);
  return targets.some((target) => target.targetType === targetType);
}

function tagMatchesSpecificId(tag, specificId, targetType) {
  const normalizedId = String(specificId || "").trim();
  if (!normalizedId) return true;

  const targets = normalizeStoredTargets(tag);
  return targets.some(
    (target) =>
      String(target.specificId || "") === normalizedId &&
      (!targetType || target.targetType === targetType)
  );
}

function targetsAreEqual(leftTargets, rightTargets) {
  const leftKeys = leftTargets.map(buildTargetKey).sort();
  const rightKeys = rightTargets.map(buildTargetKey).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index]);
}

exports.getAllTags = async (filters = {}) => {
  let tags = await Tag.find({ isActive: true }).sort({ createdAt: -1 }).lean();

  let normalizedTargetType;
  if (filters.targetType !== undefined && filters.targetType !== "") {
    normalizedTargetType = normalizeTargetType(filters.targetType);
    tags = tags.filter((tag) => tagMatchesTargetType(tag, normalizedTargetType));
  }

  if (filters.specificId !== undefined && String(filters.specificId).trim()) {
    tags = tags.filter((tag) =>
      tagMatchesSpecificId(tag, filters.specificId, normalizedTargetType)
    );
  }

  return tags.map((tag) => ({
    ...tag,
    specificTargets: normalizeStoredTargets(tag),
  }));
};

exports.getTagById = (id) => {
  return Tag.findById(id).lean();
};

exports.createTag = async (payload) => {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Name is required");
  }

  const specificTargets = await resolveSpecificTargets(payload);
  const primaryTarget = specificTargets[0] || {
    targetType: "menu",
    specificId: null,
    specificName: getGlobalSpecificName("menu"),
  };
  const slug = toSlug(payload.slug || name);
  const duplicates = await Tag.find({
    isActive: true,
    slug: { $regex: `^${escapeRegex(slug)}$`, $options: "i" },
  }).lean();

  const duplicate = duplicates.find((tag) =>
    targetsAreEqual(normalizeStoredTargets(tag), specificTargets)
  );

  if (duplicate) {
    throw new Error("Tag already exists");
  }

  const created = await Tag.create({
    name,
    slug,
    targetType: primaryTarget.targetType,
    specificTargets,
    specificId: primaryTarget.specificId,
    specificName: primaryTarget.specificName,
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
  const shouldUpdateSpecificTargets =
    payload.specificTargets !== undefined ||
    payload.targetType !== undefined ||
    payload.specificId !== undefined;
  let nextSpecificTargets = normalizeStoredTargets(current);
  if (shouldUpdateSpecificTargets) {
    nextSpecificTargets = await resolveSpecificTargets(payload);
    const primaryTarget = nextSpecificTargets[0] || {
      targetType: "menu",
      specificId: null,
      specificName: getGlobalSpecificName("menu"),
    };
    update.specificTargets = nextSpecificTargets;
    update.targetType = primaryTarget.targetType;
    update.specificId = primaryTarget.specificId;
    update.specificName = primaryTarget.specificName;
  }

  if (payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new Error("Name is required");
    }
    update.name = name;
  }

  if (
    payload.slug !== undefined ||
    payload.name !== undefined ||
    shouldUpdateSpecificTargets
  ) {
    const nextSlug = toSlug(payload.slug || update.name || current.name);
    const duplicates = await Tag.find({
      _id: { $ne: id },
      isActive: true,
      slug: { $regex: `^${escapeRegex(nextSlug)}$`, $options: "i" },
    }).lean();

    const duplicate = duplicates.find((tag) =>
      targetsAreEqual(normalizeStoredTargets(tag), nextSpecificTargets)
    );

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
