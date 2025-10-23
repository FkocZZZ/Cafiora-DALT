const express = require("express");
const { current } = require("../../../controllers/userController");
const {
  validateAccessToken,
} = require("../../../middlewares/validateAccessToken");
const { auth } = require("../../../middlewares/auth");

const router = express.Router();

// private
router.route("/current").get(validateAccessToken, current);

module.exports = router;
