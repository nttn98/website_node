const Group = require("../models/Group");
const Button = require("../../button/models/Button");
path = require("path");

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

// Lấy tất cả group có parentName theo tên (ví dụ: 'Solutions')
exports.getGroupsByParentName = (name) => {
  return Group.find({ "listParents.parentName": name, isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();
};

// Tạo group mới
exports.createGroup = async (data) => {
  // listParents
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
  // images
  let images = [];
  if (typeof data.images === "string") {
    try {
      images = JSON.parse(data.images);
    } catch {
      images = [];
    }
  } else if (Array.isArray(data.images)) images = data.images;
  else if (data.image) images = [data.image];

  // Normalize image paths to be relative URLs under /uploads
  images = (images || [])
    .map((img) => {
      if (!img) return null;
      // Ensure string and normalize slashes
      if (typeof img !== "string") img = String(img);
      img = img.replace(/\\/g, "/");
      // Remove any leading slashes and ../ segments that may have been stored
      img = img.replace(/^(?:\/+|(?:\.\.\/))+/g, "");
      // If absolute filesystem path, make it relative to public
      if (path.isAbsolute(img)) {
        return (
          "/" +
          path
            .relative(path.join(__dirname, "../../../public"), img)
            .replace(/\\/g, "/")
        );
      }
      // Normalize and prefix with single leading slash
      return "/" + img.replace(/^\/+/, "");
    })
    .filter(Boolean);

  // listButtons
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
  // Resolve button ids to { buttonId, buttonName, buttonRoute, buttonType, buttonFormId }
  const idsToResolve = (listButtons || [])
    .filter((b) => typeof b === "string")
    .map((s) => s);
  let fetched = [];
  if (idsToResolve.length) {
    try {
      fetched = await Button.find({ _id: { $in: idsToResolve } })
        .populate("form.id", "_id title shortName")
        .lean();
    } catch (err) {
      fetched = [];
    }
  }
  listButtons = (listButtons || [])
    .map((b) => {
      if (!b) return null;
      if (typeof b === "string") {
        const fb = fetched.find((x) => String(x._id) === String(b));
        const buttonType = fb ? fb.type || "route" : "route";
        const formId =
          fb && fb.form && fb.form.id && fb.form.id._id
            ? String(fb.form.id._id)
            : null;
        const formShortName =
          fb && fb.form && fb.form.id ? fb.form.id.shortName : "";
        const buttonRoute =
          buttonType === "form" && formShortName
            ? `#${formShortName}`
            : fb
            ? fb.route || ""
            : "";
        return {
          buttonId: b,
          buttonName: fb ? fb.title?.en || fb.title || "" : "",
          buttonRoute,
          buttonType,
          buttonFormId: formId,
        };
      }
      const id = b.buttonId || b.id || b._id || b.value || null;
      if (id) {
        const fb = fetched.find((x) => String(x._id) === String(id));
        const buttonType =
          b.buttonType || b.type || (fb ? fb.type || "route" : "route");
        const formId =
          b.buttonFormId ||
          b.formId ||
          (fb && fb.form && fb.form.id && fb.form.id._id
            ? String(fb.form.id._id)
            : null);
        const formShortName = fb && fb.form ? fb.form.shortName : "";
        const buttonRoute =
          buttonType === "form" && formShortName
            ? `#${formShortName}`
            : b.buttonRoute || b.route || b.link || (fb ? fb.route || "" : "");
        return {
          buttonId: id,
          buttonName:
            b.buttonName ||
            b.name ||
            (fb ? fb.title?.en || fb.title || "" : ""),
          buttonRoute,
          buttonType,
          buttonFormId: formId,
        };
      }
      return {
        buttonId: b.buttonId || null,
        buttonName: b.buttonName || b.label || b.title || "",
        buttonRoute: b.buttonRoute || b.route || b.link || b.action || "",
        buttonType: b.buttonType || b.type || "route",
        buttonFormId: b.buttonFormId || b.formId || null,
      };
    })
    .filter(Boolean);
  return Group.create({
    listParents,
    type: data.type || "-",
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
  // listParents (only when provided)
  let listParents;
  if (data.listParents !== undefined) {
    if (typeof data.listParents === "string") {
      try {
        listParents = JSON.parse(data.listParents);
      } catch {
        listParents = [];
      }
    } else if (Array.isArray(data.listParents)) {
      listParents = data.listParents;
    }
  } else if (data.parentId && data.parentName) {
    listParents = [{ parentId: data.parentId, parentName: data.parentName }];
  }

  // images (only when provided)
  let images;
  if (data.images !== undefined) {
    if (typeof data.images === "string") {
      try {
        images = JSON.parse(data.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(data.images)) images = data.images;
    else if (data.image) images = [data.image];

    // Normalize image paths
    images = (images || [])
      .map((img) => {
        if (!img) return null;
        if (typeof img !== "string") img = String(img);
        // Normalize slashes and remove leading slashes and ../ segments
        img = img.replace(/\\/g, "/");
        img = img.replace(/^(?:\/+|(?:\.\.\/))+/g, "");
        if (path.isAbsolute(img)) {
          return (
            "/" +
            path
              .relative(path.join(__dirname, "../../../public"), img)
              .replace(/\\/g, "/")
          );
        }
        // Normalize and prefix with single leading slash
        return "/" + img.replace(/^\/+/, "");
      })
      .filter(Boolean);
  }

  // listButtons (only when provided)
  let listButtons;
  if (data.listButtons !== undefined) {
    if (typeof data.listButtons === "string") {
      try {
        listButtons = JSON.parse(data.listButtons);
      } catch {
        listButtons = [];
      }
    } else if (Array.isArray(data.listButtons)) {
      listButtons = data.listButtons;
    }
  }

  const idsToResolve = (listButtons || [])
    .filter((b) => typeof b === "string")
    .map((s) => s);
  let fetched = [];
  if (idsToResolve.length) {
    try {
      fetched = await Button.find({ _id: { $in: idsToResolve } })
        .populate("form.id", "_id title shortName")
        .lean();
    } catch (err) {
      fetched = [];
    }
  }
  listButtons = (listButtons || [])
    .map((b) => {
      if (!b) return null;
      if (typeof b === "string") {
        const fb = fetched.find((x) => String(x._id) === String(b));
        const buttonType = fb ? fb.type || "route" : "route";
        const formId =
          fb && fb.form && fb.form.id && fb.form.id._id
            ? String(fb.form.id._id)
            : null;
        const formShortName =
          fb && fb.form && fb.form.id ? fb.form.id.shortName : "";
        const buttonRoute =
          buttonType === "form" && formShortName
            ? `#${formShortName}`
            : fb
            ? fb.route || ""
            : "";
        return {
          buttonId: b,
          buttonName: fb ? fb.title?.en || fb.title || "" : "",
          buttonRoute,
          buttonType,
          buttonFormId: formId,
        };
      }
      const id = b.buttonId || b.id || b._id || b.value || null;
      if (id) {
        const fb = fetched.find((x) => String(x._id) === String(id));
        const buttonType =
          b.buttonType || b.type || (fb ? fb.type || "route" : "route");
        const formId =
          b.buttonFormId ||
          b.formId ||
          (fb && fb.form && fb.form.id && fb.form.id._id
            ? String(fb.form.id._id)
            : null);
        const formShortName =
          fb && fb.form && fb.form.id ? fb.form.id.shortName : "";
        const buttonRoute =
          buttonType === "form" && formShortName
            ? `#${formShortName}`
            : b.buttonRoute || b.route || b.link || (fb ? fb.route || "" : "");
        return {
          buttonId: id,
          buttonName:
            b.buttonName ||
            b.name ||
            (fb ? fb.title?.en || fb.title || "" : ""),
          buttonRoute,
          buttonType,
          buttonFormId: formId,
        };
      }
      return {
        buttonId: b.buttonId || null,
        buttonName: b.buttonName || b.label || b.title || "",
        buttonRoute: b.buttonRoute || b.route || b.link || b.action || "",
        buttonType: b.buttonType || b.type || "route",
        buttonFormId: b.buttonFormId || b.formId || null,
      };
    })
    .filter(Boolean);

  const updateObj = {
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
    order: Number(data.order) || 0,
    isStatus: data.isStatus !== undefined ? data.isStatus : true,
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  if (data.type !== undefined) {
    updateObj.type = data.type || "-";
    if (updateObj.type === "-") {
      updateObj.content = "";
    }
  }
  if (listParents !== undefined) updateObj.listParents = listParents;
  if (images !== undefined) updateObj.images = images;
  if (data.listButtons !== undefined) updateObj.listButtons = listButtons;

  return Group.findByIdAndUpdate(id, updateObj, { new: true }).lean();
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
