const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
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

    /* ===== CONTENT TYPE ===== */
    type: {
      type: String,
      enum: ["html", "editor"],
      required: true,
    },

    /* ===== RELATION ===== */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },

    parentName: {
      type: String, // snapshot title.en của Menu
      required: true,
    },

    /* ===== CONTENT ===== */
    content: {
      type: String,
      default: "",
    },

    /* ===== IMAGE ===== */
    image: {
      type: String, // URL to image in /public/uploads/groups
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

module.exports = mongoose.model("Group", GroupSchema);
