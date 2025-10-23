const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { pushTokenToBlackList } = require("../databases/redis/redisJwt");
const RefreshModel = require("../models/refreshModel");
const { DateTime } = require("luxon");
const User = require("../models/userModel");

//@desc Login User
//@route POST /api/users/login
//@access private
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress =
    req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const userAgent = req.useragent;

  const time = String(
    DateTime.now().setZone("Asia/Ho_Chi_Minh").toFormat("yyyy-MM-dd HH:mm:ss")
  );

  if (!email || !password) {
    res.status(400);
    throw new Error("All fields are mandatory!");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found!");
  }
  //compare password with hashedpassword
  if (user && (await bcrypt.compare(password, user.password))) {
    // generate access token
    const accessToken = jwt.sign(
      {
        user: {
          username: user.username,
          email: user.email,
          id: user.id,
        },
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "5h",
      }
    );

    console.log(accessToken, "accessToken");

    // generate refresh token

    const refreshToken = jwt.sign(
      {
        user: {
          username: user.username,
          email: user.email,
          id: user.id,
        },
      },
      process.env.REFRESH_SECRET_KEY,
      {
        expiresIn: "30d",
      }
    );
    console.log("refreshToken");

    RefreshModel.create({
      email: user.email,
      username: user.username,
      deviceInfo: {
        ipAddress: ipAddress,
        userAgent: userAgent.browser,
      },
      token: refreshToken,
      time: time,
    });

    // 30 * 24 * 60 * 60 * 1000 = 30 days
    res.cookie("refreshToken", refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "None",
      // path: "/"
    });
    res.status(200).json({
      accessToken,
      username: user.username,
      success: true,
      role: user.role,
    });
  } else {
    res.status(401);
    throw new Error("email or password is not valid");
  }

  //compare password with hashedpassword
  res.status(201).json({ message: "login successful" });
});

//@desc Current User
//@route POST /api/users/current
//@access private
const current = asyncHandler(async (req, res) => {
  res.status(200).json({
    email: req.user.email,
    role: req.user.role,
    id: req.user.id,
  });
});

//@desc Logout User
//@route POST /api/users/logout
//@access public
const logout = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  const cookie = req.cookies.refreshToken;

  try {
    if (!cookie) {
      return res.status(400).json({
        message: "Không có refreshToken trong cookie!",
      });
    }
    // push refresh token to blacklist redis

    try {
      await pushTokenToBlackList(email, token, 900);
      await RefreshModel.findOneAndDelete({ token: cookie });
    } catch (error) {
      console.log(error);
    }
    // clear cookie from client
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true, //     true khi có https
      sameSite: "none", // none khi có https
      path: "/",
    });
    console.log(req.cookies.refreshToken);

    if (req.cookies.refreshToken) {
      res.status(200).json({
        message: "logout successfull",
        success: true,
      });
    } else {
      res.status(400).json({
        message: "refreshToken Van Ton Tai",
      });
    }
  } catch {
    console.error("Server error:", error);
    res.status(500).json({ message: "Internal server error" });
  }

  res.status(200).json({ message: `${email} Log out successful` });
});

//@desc Refresh User
//@route POST /api/users/refresh
//@access private
const refresh = asyncHandler(async (req, res) => {
  try {
    const accessToken = jwt.sign(
      {
        user: {
          username: req.user.username,
          email: req.user.email,
          id: req.user.id,
          role: req.user.role,
        },
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      accessToken,
    });
  } catch (err) {
    console.error("Error generating access token:", err);
    res.status(500).json({ message: "Error generating access token" });
  }
});

module.exports = { login, current, logout, refresh };
