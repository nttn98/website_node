const Submission = require("../models/FormSubmission");

exports.createSubmission = (data) => {
  return Submission.create(data);
};

exports.getAllSubmissions = () => {
  return Submission.find({ isActive: true }).sort({ createdAt: -1 }).lean();
};

exports.getSubmissionById = (id) => {
  return Submission.findById(id).lean();
};

exports.toggleHandled = async (id) => {
  const s = await Submission.findById(id);
  if (!s) return null;
  s.isHandled = !s.isHandled;
  await s.save();
  return s;
};

exports.deleteSubmission = (id) => {
  return Submission.findByIdAndUpdate(id, { isActive: false, isHandled: true });
};
