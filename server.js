const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const compression = require("compression");
const methodOverride = require("method-override");
require("dotenv").config();

const app = express();

/* ===== TRUST PROXY (BẮT BUỘC khi dùng IIS reverse proxy) ===== */
app.set("trust proxy", 1);

/* ===== SECURITY ===== */
const helmet = require("helmet");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
  })
);
app.use(compression());

/* ===== DATABASE ===== */
mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: false,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });

/* ===== BODY PARSER ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

/* ===== SESSION ===== */
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // đổi true nếu dùng HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2, // 2 giờ
    },
  })
);

/* ===== GLOBAL LOCALS ===== */
app.use((req, res, next) => {
  res.locals.currentMenuId = null;
  res.locals.menus = [];
  next();
});

/* ===== VIEW ENGINE ===== */
app.use(expressLayouts);
app.set("layout", "layouts/dashboard");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===== STATIC FILES ===== */
app.use(express.static(path.join(__dirname, "public")));

/* ===== SWAGGER ===== */
require("./swagger")(app);

/* ===== ROUTES ===== */
app.use("/user", require("./modules/user/routes/user.routes"));
app.use("/api/menus", require("./modules/menu/routes/menu.routes"));
app.use("/api/homepage", require("./modules/homepage/routes/homepage.routes"));
app.use("/dashboard", require("./modules/dashboard/routes/dashboard.routes"));
app.use("/groups", require("./modules/group/routes/group.routes"));
app.use("/details", require("./modules/detail/routes/detail.routes"));
app.use("/buttons", require("./modules/button/routes/button.routes"));
app.use("/forms", require("./modules/form/routes/form.routes"));
app.use("/api/forms", require("./modules/form/routes/submission.routes"));
app.use("/api/socials", require("./modules/social/routes/social.routes"));
app.use("/", require("./routes/view.routes"));

/* ===== 404 HANDLER ===== */
// app.use((req, res) => {
//   res.status(404).render("errors/404");
// });

/* ===== GLOBAL ERROR HANDLER ===== */
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send("Something went wrong!");
// });

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
