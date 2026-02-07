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
      enum: ["-", "html", "editor"],
      default: "-",
      required: true,
    },

    /* ===== RELATION ===== */
    listParents: [
      {
        parentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true,
        },
        parentName: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          default: 0,
        },
        _id: false,
      },
    ],

    /* ===== IMAGES ===== */
    images: [
      {
        type: String,
        default: "",
      },
    ],

    listButtons: [
      {
        buttonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Button",
          default: null,
        },
        buttonName: {
          type: String,
          default: "",
        },
        buttonRoute: {
          type: String,
          default: "",
        },
        _id: false,
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

module.exports = mongoose.model("Group", GroupSchema);
