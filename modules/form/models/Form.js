const mongoose = require("mongoose");

const FormSchema = new mongoose.Schema(
  {
    title: {
      type: Map,
      of: String,
      required: true,
    },

    subTitle: {
      type: Map,
      of: String,
      required: false,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Button",
      default: null,
    },
    parentName: {
      type: String,
      default: null,
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

module.exports = mongoose.model("Button", FormSchema);
