const userService = require("../services/user.services");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const user = await userService.login(req.body.username, req.body.password);
    req.session.user = { _id: user._id, username: user.username };

    const wantsJSON =
      req.xhr ||
      (req.headers.accept &&
        req.headers.accept.indexOf("application/json") !== -1) ||
      req.is("application/json");
    if (wantsJSON) {
      return res.json({
        success: true,
        data: { _id: user._id, username: user.username },
      });
    }

    res.redirect("/dashboard/menus");
  } catch (err) {
    const wantsJSON =
      req.xhr ||
      (req.headers.accept &&
        req.headers.accept.indexOf("application/json") !== -1) ||
      req.is("application/json");
    if (wantsJSON) {
      return res.status(401).json({
        success: false,
        message: err.message || "Authentication failed",
      });
    }

    res.render("user/login", {
      layout: false,
      error: "Please! Check your connection",
    });
  }
};

// Logout (destroy session) — returns JSON when requested
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout failed", err);
    const wantsJSON =
      req.xhr ||
      (req.headers.accept &&
        req.headers.accept.indexOf("application/json") !== -1) ||
      req.is("application/json");
    if (wantsJSON) return res.json({ success: true });
    res.redirect("/user/login");
  });
};

// Lấy tất cả user
exports.getAllUsers = async (req, res) => {
  const params = getPaginationParams(req, { defaultLimit: 30, maxLimit: 300 });
  const users = await userService.getAllUsers();
  const paged = paginateArray(users, params);
  res.json({ success: true, data: paged.items, pagination: paged.pagination });
};

// Lấy 1 user theo id
exports.getUserById = async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: user });
};

// Tạo user mới
exports.createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Cập nhật user
exports.updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Xóa user
exports.deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
