const mongoose = require("mongoose");

const SocialSchema = new mongoose.Schema(
  {
    name: { type: String },
    iconClass: { type: String },
    code: { type: String },
    url: { type: String },
    type: { type: String },
    order: { type: Number, default: 0 },
    isStatus: { type: Boolean, default: true }, // visible on frontend
    isActive: { type: Boolean, default: true }, // soft delete
  },
  { timestamps: true }
);

module.exports = mongoose.model("Social", SocialSchema);
