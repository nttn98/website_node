const mongoose = require("mongoose");

const DetailSchema = new mongoose.Schema(
  {
    /* ===== MULTI LANGUAGE ===== */
    title: {
      type: Map,
      of: String,
      required: true,
    },

    subtitle: {
      type: Map,
      of: String,
      default: {},
    },

    images: [
      {
        type: String,
        default: "",
      },
    ],

    /* ===== CONTENT TYPE ===== */
    type: {
      type: String,
      enum: ["html", "editor"],
      required: true,
    },

    /* ===== RELATION ===== */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    subParentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },

    parentName: {
      type: String, // snapshot title.en của Group
      required: true,
    },

    subParentName: {
      type: String, // snapshot title.en của Menu
      required: true,
    },

    /* ===== CONTENT ===== */
    content: {
      type: String,
      default: "",
    },

    /* ===== STATUS ===== */
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

module.exports = mongoose.model("Detail", DetailSchema);
