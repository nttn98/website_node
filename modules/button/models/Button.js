const mongoose = require("mongoose");

const ButtonSchema = new mongoose.Schema(
  {
    title: {
      type: Map,
      of: String,
      required: true,
    },

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
      _id: false,
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

ButtonSchema.index({ isActive: 1, createdAt: -1 });
ButtonSchema.index({ isActive: 1, isStatus: 1 });

module.exports = mongoose.model("Button", ButtonSchema);
