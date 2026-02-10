const mongoose = require("mongoose");

const FormSubmissionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      default: null,
    },
    formType: {
      type: String,
      default: null,
    },
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    userAgent: {
      type: String,
      default: null,
    },
    isHandled: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FormSubmission", FormSubmissionSchema);
