const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Menu API",
      version: "1.0.0",
      description: "API documentation for Menu management",
    },
    tags: [
      { name: "Menu", description: "Menu management" },
      { name: "Group", description: "Group management" },
      { name: "Detail", description: "Detail management" },
      { name: "User", description: "User management" },
      { name: "Dashboard", description: "Dashboard" },
    ],
  },
  apis: ["./modules/*/routes/*.js"], // Đường dẫn tới tất cả các file routes trong modules
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = (app) => {
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
