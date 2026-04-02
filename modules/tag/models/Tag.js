const mongoose = require("mongoose");
const { Schema } = mongoose;

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
    targetType: {
      type: String,
      enum: ["menu", "group"],
      default: "menu",
      required: true,
    },
    specificTargets: [
      {
        targetType: {
          type: String,
          enum: ["menu", "group"],
          required: true,
        },
        specificId: {
          type: Schema.Types.ObjectId,
          default: null,
        },
        specificName: {
          type: String,
          default: "",
          trim: true,
        },
        _id: false,
      },
    ],
    specificId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    specificName: {
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
TagSchema.index({ isActive: 1, targetType: 1, slug: 1 });
TagSchema.index({ isActive: 1, targetType: 1, specificId: 1, slug: 1 });
TagSchema.index({ isActive: 1, "specificTargets.targetType": 1, slug: 1 });
TagSchema.index({ isActive: 1, "specificTargets.specificId": 1, slug: 1 });

module.exports = mongoose.model("Tag", TagSchema);
