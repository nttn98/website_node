const mongoose = require("mongoose");

const ButtonSchema = new mongoose.Schema(
  {
    title: {
      type: Map,
      of: String,
      required: true,
    },

    parents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],

    route: {
      type: String,
      default: null,
    },

    // Type of button: 'route' (link) or 'form' (open a form)
    type: {
      type: String,
      default: "route",
    },

    // store a small form object for quick access
    form: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Form",
        default: null,
      },
      shortName: {
        type: String,
        default: "",
      },
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
