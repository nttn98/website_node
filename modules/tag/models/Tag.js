const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      default: "",
      trim: true,
    },
    isStatus: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

TagSchema.index({ isActive: 1, createdAt: -1 });
TagSchema.index({ isActive: 1, slug: 1 });

module.exports = mongoose.model("Tag", TagSchema);
