const Group = require("../models/Group");

// Lấy tất cả group, sort theo order (dùng cho dashboard)
exports.getAllGroupsSorted = () => {
  return Group.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();
};

// Lấy tất cả group có parentId (theo listParents)
exports.getGroupsByParent = (parentId) => {
  return Group.find({ "listParents.parentId": parentId, isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();
};

// Tạo group mới
exports.createGroup = async (data) => {
  // Chuẩn hóa listParents
  let listParents = [];
  if (typeof data.listParents === "string") {
    try {
      listParents = JSON.parse(data.listParents);
    } catch {
      listParents = [];
    }
  } else if (Array.isArray(data.listParents)) {
    listParents = data.listParents;
  } else if (data.parentId && data.parentName) {
    listParents = [{ parentId: data.parentId, parentName: data.parentName }];
  }
  // Chuẩn hóa images
  let images = [];
  if (typeof data.images === "string") {
    try {
      images = JSON.parse(data.images);
    } catch {
      images = [];
    }
  } else if (Array.isArray(data.images)) images = data.images;
  else if (data.image) images = [data.image];
  // Chuẩn hóa listButtons
  let listButtons = [];
  if (typeof data.listButtons === "string") {
    try {
      listButtons = JSON.parse(data.listButtons);
    } catch {
      listButtons = [];
    }
  } else if (Array.isArray(data.listButtons)) {
    listButtons = data.listButtons;
  }
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

// Lấy group theo id
exports.getGroupById = (id) => {
  return Group.findById(id).lean();
};

// Lấy group document (Mongoose document, not lean) để có thể .save()
exports.getGroupDocById = (id) => {
  return Group.findById(id);
};

// Cập nhật group
exports.updateGroup = async (id, data) => {
  // Chuẩn hóa listParents
  let listParents = [];
  if (typeof data.listParents === "string") {
    try {
      listParents = JSON.parse(data.listParents);
    } catch {
      listParents = [];
    }
  } else if (Array.isArray(data.listParents)) {
    listParents = data.listParents;
  } else if (data.parentId && data.parentName) {
    listParents = [{ parentId: data.parentId, parentName: data.parentName }];
  }
  // Chuẩn hóa images
  let images = [];
  if (typeof data.images === "string") {
    try {
      images = JSON.parse(data.images);
    } catch {
      images = [];
    }
  } else if (Array.isArray(data.images)) images = data.images;
  else if (data.image) images = [data.image];
  // Chuẩn hóa listButtons
  let listButtons = [];
  if (typeof data.listButtons === "string") {
    try {
      listButtons = JSON.parse(data.listButtons);
    } catch {
      listButtons = [];
    }
  } else if (Array.isArray(data.listButtons)) {
    listButtons = data.listButtons;
  }
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

// Xóa group (ẩn)
exports.deleteGroup = (id) => {
  return Group.findByIdAndUpdate(id, {
    isActive: false,
    isStatus: false,
  });
};

// Đổi trạng thái group
exports.toggleStatus = async (id) => {
  const group = await Group.findById(id);
  group.isStatus = !group.isStatus;
  await group.save();
  return group;
};

// Các hàm chuẩn hóa, không trùng lặp
// getAllGroupsSorted, getGroupsByParent, createGroup, getGroupById, updateGroup, deleteGroup, toggleStatus
