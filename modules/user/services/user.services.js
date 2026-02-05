const User = require("../models/User");
const bcrypt = require("bcrypt");

// Đăng nhập
exports.login = async (username, password) => {
  const user = await User.findOne({ username });
  if (!user) throw new Error("Sai tài khoản hoặc mật khẩu");
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Sai tài khoản hoặc mật khẩu");
  return user;
};

exports.getAllUsers = () => {
  return User.find({}, "_id username").lean();
};

exports.getUserById = (id) => {
  return User.findById(id, "_id username").lean();
};

exports.createUser = async (data) => {
  const { username, password } = data;
  if (!username || !password) throw new Error("Missing username or password");
  const exists = await User.findOne({ username });
  if (exists) throw new Error("Username already exists");
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: hash });
  return { _id: user._id, username: user.username };
};

exports.updateUser = async (id, data) => {
  const update = {};
  if (data.username) update.username = data.username;
  if (data.password) update.password = await bcrypt.hash(data.password, 10);
  const user = await User.findByIdAndUpdate(id, update, {
    new: true,
    fields: "_id username",
  });
  return user;
};

exports.deleteUser = async (id) => {
  await User.findByIdAndDelete(id);
  return { success: true };
};
