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
      enum: ["-", "html", "editor", "link-share-video"],
      default: "-",
      required: true,
    },

    /* ===== CONTENT ===== */
    content: {
      type: String,
      default: "",
    },

    videoShareList: [
      {
        linkUrl: {
          type: String,
          default: "",
        },
        image: {
          type: String,
          default: "",
        },
        tag: {
          type: String,
          default: "",
        },
        title: {
          type: String,
          default: "",
        },
        _id: false,
      },
    ],

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

    /* ===== IMAGE ===== */
    image: {
      type: String,
      default: "",
    },

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
        // New: store button type ('route' or 'form') and optional linked form id
        buttonType: {
          type: String,
          default: "route",
        },
        buttonFormId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Form",
          default: null,
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

GroupSchema.index({ isActive: 1, createdAt: -1 });
GroupSchema.index({ "listParents.parentId": 1, isActive: 1 });
GroupSchema.index({ isActive: 1, isStatus: 1 });

module.exports = mongoose.model("Group", GroupSchema);
