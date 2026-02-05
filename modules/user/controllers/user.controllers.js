const userService = require("../services/user.services");

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const user = await userService.login(req.body.username, req.body.password);
    req.session.user = { _id: user._id, username: user.username };
    res.redirect("/dashboard/menus");
  } catch (err) {
    res.render(
      "user/login",
      { layout: false },
      { error: "Please! Check your connection" }
    );
  }
};

// Lấy tất cả user
exports.getAllUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  res.json({ success: true, data: users });
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
