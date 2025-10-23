const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcrypt"); // hoặc bcrypt

//@desc Register User
//@route POST /api/cashier/register
//@access public
const cashierRegister = asyncHandler(async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error("All fields are mandatory!");
    }

    if (role === "cashier") {
      res.status(409);
      throw new Error("Khong the co cashier thu 2");
    }

    // Check user already exist
    const userExist = await User.findOne({ email });

    if (userExist) {
      res.status(400);
      throw new Error("Email is already in use!");
    }

    //Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed Password:", hashedPassword);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        email: user.email,
        username: user.username,
        success: true,
      });
    } else {
      res.status(400);
      throw new Error("User data is not valid");
    }
  } catch (error) {
    res.status(500);
    throw new Error(`An error occured: ${error}`);
  }
});

//@desc getAllUser
//@route POST /api/GetAllUser
//@access private
const getAllUser = asyncHandler(async (req, res) => {
  try {
    const allUser = await User.find(); // lấy tất cả dữ liệu
    if (!allUser) {
      return res.status(400).json({
        message: "Không có dữ liệu người dùng",
        success: false,
      });
    }
    res.status(200).json({
      message: "lấy dữ liệu thành công",
      dataUsers: allUser,
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Lỗi khi lấy dữ liệu người dùng : ${error}` });
  }
});

//@desc deleteUser
//@route DELETE /api/deleteUser
//@access private
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        message: "id khong ton tai hoac sai id",
        success: false,
      });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({
      message: "xóa dữ liệu người dùng thành công",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: `${error}` });
  }
});

module.exports = {
  cashierRegister,
  getAllUser,
  deleteUser,
};
