const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "U&I Logistics API",
      version: "1.0.0",
      description:
        "API documentation for U&I Logistics website management system",
    },
    tags: [
      { name: "Homepage", description: "Homepage API for frontend" },
      { name: "Menu", description: "Menu management" },
      { name: "Group", description: "Group management" },
      { name: "Buttons", description: "Button management" },
      { name: "User", description: "User management" },
      { name: "Dashboard", description: "Dashboard" },
      { name: "Social", description: "Social media links" },
      { name: "Tags", description: "Tag management" },
      { name: "Forms", description: "Form management and submission" },
    ],
  },
  apis: ["./modules/*/routes/*.js"], // Đường dẫn tới tất cả các file routes trong modules
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = (app) => {
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
