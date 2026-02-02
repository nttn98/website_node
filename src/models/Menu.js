const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    title: {
      type: Map,
      of: String, // en, vi, zh...
      required: true,
    },

    route: {
      type: String,
      default: null,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      default: null,
    },

    order: {
      type: Number,
      default: 0,
    },

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", MenuSchema);
