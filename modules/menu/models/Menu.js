const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    title: {
      type: Map,
      of: String, // en, vi, zh...
      required: true,
    },

    subTitle: {
      type: Map,
      of: String, // en, vi, zh...
      required: false,
    },

    route: {
      type: String,
      default: null,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      default: null,
    },
    parentName: {
      type: String,
      default: null,
    },

    order: {
      type: Number,
      default: 0,
    },

    image: {
      type: String,
      default: "",
    },

    showHomePage: {
      type: Boolean,
      default: false,
    },

    tags: [
      {
        type: String,
      },
    ],

    // ===== DISPLAY FLAGS =====
    type: {
      type: String,
      enum: ["top", "bot"],
      required: true,
    },

    isButton: {
      type: Boolean,
      default: false,
    },

    // ===== STATUS =====
    isStatus: {
      type: Boolean,
      default: true, // true = show, false = hide
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // (removed listChildMenu, now using parentId/parentName)
  },
  { timestamps: true }
);

MenuSchema.index({ isActive: 1, order: 1 });
MenuSchema.index({ parentId: 1, isActive: 1, order: 1 });

module.exports = mongoose.model("Menu", MenuSchema);
