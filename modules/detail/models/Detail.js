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

    /* ===== OPTIONAL ===== */
    listArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Article",
      },
    ],

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
