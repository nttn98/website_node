// Lấy tất cả group của 1 menu
exports.getDetailsByMenu = (menuId) => {
  return Group.find({ parentId: menuId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
};
// Lấy tất cả group của 1 menu (theo listParents)
exports.getDetailsByMenu = (menuId) => {
  return Group.find({
    "listParents.parentId": menuId,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean();
};
const Group = require("../models/Group");

/* ===== DASHBOARD ===== */

exports.getAllDetails = () => {
  return Group.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

exports.getByMenu = (menuId) => {
  return Group.findOne({
    parentId: menuId,
    isActive: true,
  }).lean();
};

exports.create = async (data) => {
  // Menu model sẽ được require từ modules/menu/models/Menu nếu cần
  // const menu = await Menu.findById(data.parentId).lean();
  return Group.create({
    parentId: data.parentId,
    parentName: data.parentName,
    type: data.type,
    content: data.content,
    title: {
      en: data.title_en,
      vi: data.title_vi,
      zh: data.title_zh,
    },
    subtitle: {
      en: data.subtitle_en,
      vi: data.subtitle_vi,
      zh: data.subtitle_zh,
    },
    image: data.image || "",
    isStatus: true,
    isActive: true,
  });
};
exports.create = async (data) => {
  // Chuẩn hóa listParents
  let listParents = [];
  if (Array.isArray(data.listParents)) {
    listParents = data.listParents;
  } else if (data.parentId && data.parentName) {
    listParents = [{ parentId: data.parentId, parentName: data.parentName }];
  }
  // Chuẩn hóa images
  let images = [];
  if (Array.isArray(data.images)) images = data.images;
  else if (data.image) images = [data.image];
  // Chuẩn hóa listButtons
  let listButtons = Array.isArray(data.listButtons) ? data.listButtons : [];
  return Group.create({
    listParents,
    type: data.type,
    content: data.content,
    title: {
      en: data.title_en,
      vi: data.title_vi,
      zh: data.title_zh,
    },
    subtitle: {
      en: data.subtitle_en,
      vi: data.subtitle_vi,
      zh: data.subtitle_zh,
    },
    images,
    listButtons,
    order: Number(data.order) || 0,
    isStatus: true,
    isActive: true,
  });
};

exports.getDetailById = (id) => {
  return Group.findById(id).lean();
};

exports.updateDetail = (id, data) => {
  const update = {
    type: data.type,
    content: data.content,
  };

  if (data.title_en) update["title.en"] = data.title_en;
  if (data.title_vi) update["title.vi"] = data.title_vi;
  if (data.title_zh) update["title.zh"] = data.title_zh;

  if (data.subtitle_en) update["subtitle.en"] = data.subtitle_en;
  if (data.subtitle_vi) update["subtitle.vi"] = data.subtitle_vi;
  if (data.subtitle_zh) update["subtitle.zh"] = data.subtitle_zh;

  return Group.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );
};
exports.updateDetail = async (id, data) => {
  // Chuẩn hóa listParents
  let listParents = [];
  if (Array.isArray(data.listParents)) {
    listParents = data.listParents;
  } else if (data.parentId && data.parentName) {
    listParents = [{ parentId: data.parentId, parentName: data.parentName }];
  }
  // Chuẩn hóa images
  let images = [];
  if (Array.isArray(data.images)) images = data.images;
  else if (data.image) images = [data.image];
  // Chuẩn hóa listButtons
  let listButtons = Array.isArray(data.listButtons) ? data.listButtons : [];
  return Group.findByIdAndUpdate(
    id,
    {
      listParents,
      type: data.type,
      content: data.content,
      title: {
        en: data.title_en,
        vi: data.title_vi,
        zh: data.title_zh,
      },
      subtitle: {
        en: data.subtitle_en,
        vi: data.subtitle_vi,
        zh: data.subtitle_zh,
      },
      images,
      listButtons,
      order: Number(data.order) || 0,
      isStatus: data.isStatus !== undefined ? data.isStatus : true,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    { new: true }
  ).lean();
};

exports.deleteDetail = (id) => {
  return Group.findByIdAndUpdate(id, {
    isActive: false,
    isStatus: false,
  });
};

exports.toggleStatus = async (id) => {
  const group = await Group.findById(id);
  group.isStatus = !group.isStatus;
  await group.save();
  return group;
};
