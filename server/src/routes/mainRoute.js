const express = require("express");
const router = express.Router();
const userRoute = require("./userRoute/userRoute");
const cashierRoute = require("./cashierRoute/cashierRoute");
const productRoute = require("./productRoute/productRoute");
const waiterRoute = require("./waiterRoute/waiterRoute");
const baristaRoute = require("./baristaRoute/baristaRoute");
router.use("/api", userRoute);
router.use("/api", cashierRoute);
router.use("/api", productRoute);
router.use("/api", waiterRoute);
router.use("/api", baristaRoute);

module.exports = router;
