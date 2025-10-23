const express = require("express");
const uploadFilesMiddleware = require("../../middlewares/upLoad");
const {
  cashierRegister,
  getAllUser,
  deleteUser,
} = require("../../controllers/cashierController");

const router = express.Router();
const { auth } = require("../../middlewares/auth");
const {
  validateAccessToken,
} = require("../../middlewares/validateAccessToken");
const {
  updateProduct,
  uploadProduct,
  deleteProduct,
} = require("../../controllers/productController");

//----------- Route cashier product -------------------//

// route cashier dang san pham
router
  .route("/cashier/uploadProduct")
  .post(
    validateAccessToken,
    auth(["cashier"]),
    uploadFilesMiddleware,
    uploadProduct
  );

// route cashier cap nhat san pham
router
  .route("/cashier/updateProduct/:id")
  .put(
    validateAccessToken,
    auth(["cashier"]),
    uploadFilesMiddleware,
    updateProduct
  );
// route cashier xoa san pham
router
  .route("/cashier/deleteProduct/:id")
  .delete(validateAccessToken, auth(["cashier"]), deleteProduct);

// ------------------ route cashier quan ly user -------------------//

// route cashier nhan tat ca tai khoan
router
  .route("/cashier/getAllUser")
  .get(validateAccessToken, auth(["cashier"]), getAllUser);
// route cashier dang ki tai khoan
router
  .route("/cashier/cashierRegister")
  .post(validateAccessToken, auth(["cashier"]), cashierRegister);
router
  .route("/cashier/deleteUser")
  .delete(validateAccessToken, auth(["cashier"]), deleteUser);

module.exports = router;
