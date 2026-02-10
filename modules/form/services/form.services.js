const FormModel = require("../models/Form");
const Group = require("../../group/models/Group");

exports.getAllForms = () => {
  return FormModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

exports.getFormById = (id) => {
  return FormModel.findById(id).lean();
};

exports.getFormDocById = (id) => {
  return FormModel.findById(id);
};

exports.createForm = async (data) => {
  // helper to create a shortName (slug) from title
  function makeShortName(s) {
    if (!s) return "";
    // normalize and remove diacritics
    const noDiacritics = s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[\u0300-\u036f]/g, "");
    return noDiacritics
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }
  // Normalize fields
  let fields = [];
  if (typeof data.fields === "string") {
    try {
      fields = JSON.parse(data.fields);
    } catch {
      fields = [];
    }
  } else if (Array.isArray(data.fields)) fields = data.fields;

  // Ensure each field has a name and unique names
  function normalizeFields(arr) {
    const seen = new Set();
    return (arr || []).map((f, idx) => {
      const fld = Object.assign({}, f);
      // ensure order
      fld.order = Number.isFinite(fld.order) ? fld.order : idx;
      // ensure name
      const base = (
        fld.name ||
        (fld.label || "").toLowerCase().replace(/\s+/g, "_") ||
        "field"
      )
        .replace(/[^a-z0-9_]/gi, "_")
        .toLowerCase();
      let name = base;
      let i = 1;
      while (seen.has(name)) {
        name = `${base}_${i++}`;
      }
      seen.add(name);
      fld.name = name;
      // ensure options array for select
      if (fld.type === "select" && !Array.isArray(fld.options))
        fld.options = [];
      // ensure optionsSource
      if (!fld.optionsSource)
        fld.optionsSource = { type: "static", menuId: null };
      return fld;
    });
  }
  fields = normalizeFields(fields);

  const created = await FormModel.create({
    title: {
      en: data.title_en || data.title || "",
      vi: data.title_vi || data.title || "",
      zh: data.title_zh || data.title || "",
    },
    subTitle: {
      en: data.subtitle_en || data.subtitle || "",
      vi: data.subtitle_vi || data.subtitle || "",
      zh: data.subtitle_zh || data.subtitle || "",
    },
    shortName: makeShortName(data.title_en || data.title || ""),
    route: data.route || null,
    fields,
    isStatus: true,
    isActive: true,
  });
  return created.toObject ? created.toObject() : created;
};

exports.updateForm = async (id, data) => {
  // helper to create a shortName (slug) from title (same as in create)
  function makeShortName(s) {
    if (!s) return "";
    const noDiacritics = s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[\u0300-\u036f]/g, "");
    return noDiacritics
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }
  const update = {
    route: data.route || null,
  };
  if (data.title_en) update["title.en"] = data.title_en;
  if (data.title_vi) update["title.vi"] = data.title_vi;
  if (data.title_zh) update["title.zh"] = data.title_zh;

  // update shortName when title is provided (auto-generate)
  if (data.title_en !== undefined || data.title !== undefined) {
    const src = data.title_en || data.title || "";
    update["shortName"] = makeShortName(src);
  }

  if (data.subtitle_en !== undefined) update["subTitle.en"] = data.subtitle_en;
  if (data.subtitle_vi !== undefined) update["subTitle.vi"] = data.subtitle_vi;
  if (data.subtitle_zh !== undefined) update["subTitle.zh"] = data.subtitle_zh;

  if (data.subtitle_en !== undefined || data.subTitle !== undefined) {
    const src = data.subtitle_en || data.subTitle || "";
  }

  // Fields (optional)
  if (data.fields !== undefined) {
    let fields = [];
    if (typeof data.fields === "string") {
      try {
        fields = JSON.parse(data.fields);
      } catch {
        fields = [];
      }
    } else if (Array.isArray(data.fields)) fields = data.fields;

    // normalize before saving
    function normalizeFields(arr) {
      const seen = new Set();
      return (arr || []).map((f, idx) => {
        const fld = Object.assign({}, f);
        fld.order = Number.isFinite(fld.order) ? fld.order : idx;
        const base = (
          fld.name ||
          (fld.label || "").toLowerCase().replace(/\s+/g, "_") ||
          "field"
        )
          .replace(/[^a-z0-9_]/gi, "_")
          .toLowerCase();
        let name = base;
        let i = 1;
        while (seen.has(name)) {
          name = `${base}_${i++}`;
        }
        seen.add(name);
        fld.name = name;
        if (fld.type === "select" && !Array.isArray(fld.options))
          fld.options = [];
        if (!fld.optionsSource)
          fld.optionsSource = { type: "static", menuId: null };
        return fld;
      });
    }

    fields = normalizeFields(fields);
    update.fields = fields;
  }

  await FormModel.findByIdAndUpdate(id, update);
  return FormModel.findById(id).lean();
};

exports.deleteForm = async (id) => {
  await FormModel.findByIdAndUpdate(id, { isActive: false, isStatus: false });
  return { success: true };
};

exports.toggleStatus = async (id) => {
  const b = await FormModel.findById(id);
  if (!b) return null;
  b.isStatus = !b.isStatus;
  await b.save();
  return b;
};
