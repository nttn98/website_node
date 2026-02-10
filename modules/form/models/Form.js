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

    shortName: {},

    // Form builder fields
    fields: [
      {
        name: { type: String, default: "" },
        label: { type: String, default: "" },
        type: { type: String, default: "text" }, // text | textarea | select | menuChildren
        placeholder: { type: String, default: "" },
        required: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        options: [
          {
            id: { type: String, default: "" },
            name: { type: String, default: "" },
            _id: false,
          },
        ],
        optionsSource: {
          type: {
            type: String,
            enum: ["static", "menuChildren"],
            default: "static",
          },
          menuId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Menu",
            default: null,
          },
        },
        _id: false,
      },
    ],

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

module.exports = mongoose.model("Form", FormSchema);
