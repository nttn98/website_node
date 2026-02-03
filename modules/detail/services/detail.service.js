const Detail = require("../models/Detail");

exports.getAllArticles = () => {
  return Detail.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

exports.getArticleById = (id) => {
  return Detail.findById(id).lean();
};

exports.createArticle = async (data) => {
  return Detail.create({
    parentId: data.parentId,
    subParentId: data.subParentId,
    parentName: data.parentName,
    subParentName: data.subParentName,
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
    isStatus: true,
    isActive: true,
  });
};

exports.updateArticle = (id, data) => {
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
  return Detail.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );
};

exports.deleteArticle = (id) => {
  return Detail.findByIdAndUpdate(id, {
    isActive: false,
    isStatus: false,
  });
};

exports.toggleStatus = async (id) => {
  const detail = await Detail.findById(id);
  detail.isStatus = !detail.isStatus;
  await detail.save();
  return detail;
};
