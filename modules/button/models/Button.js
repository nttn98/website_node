const mongoose = require("mongoose");

const ButtonSchema = new mongoose.Schema(
  {
    title: {
      type: Map,
      of: String,
      required: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    parentName: {
      type: String,
      default: null,
    },

    route: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      enum: ["html", "editor"],
      required: true,
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

module.exports = mongoose.model("Button", ButtonSchema);
