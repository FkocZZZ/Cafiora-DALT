const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const { cloudinary } = require("../configs/cloudinaryConfig");

//@desc getDataProduct
//@route GET /api/getProduct
//@access private
const GetAllData = asyncHandler(async (req, res) => {
  try {
    const allProduct = await Product.find(); // lấy tất cả dữ liệu
    res.status(200).json({
      message: "lấy dữ liệu thành công",
      success: true,
      dataProduct: allProduct,
    });
  } catch (error) {
    res.status(500).json({ message: `Lỗi khi lấy dữ liệu sản phẩm: ${error}` });
  }
});

//@desc uploadProduct
//@route post /api/cashier/uploadProduct
//@access private
const uploadProduct = asyncHandler(async (req, res) => {
  try {
    const { nameProduct, price } = req.body;
    const fileImage = req.image || null;

    if (!fileImage) {
      return res.status(400).json({ message: "No image file uploaded" });
    }
    const imageUrl = fileImage.path;
    const publicId = fileImage.filename;

    if (!nameProduct || !price) {
      // xóa ảnh nếu thiếu field
      await cloudinary.uploader.destroy(publicId);
      return res.status(400).json({ message: "Missing required fields" });
    }

    const product = await Product.create({
      nameProduct,
      price: Number(price),
      status: true,
      urlImage: imageUrl,
    });

    if (product) {
      res
        .status(201)
        .json({ message: "Upload thành công!", product, success: true });
    } else {
      // xóa ảnh nếu tạo thất bại
      await cloudinary.uploader.destroy(publicId);
      res.status(400);
      throw new Error("Product data is not valid");
    }
  } catch (err) {
    if (req.image?.filename) {
      await cloudinary.uploader.destroy(req.image.filename);
    }
    res.status(500).json({ error: err.message });
  }
});

//@desc updateProduct
//@route put /api/cashier/updateProduct/:id
//@access private
const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { nameProduct, price } = req.body;
    const fileImage = req.image || null;
    const imageUrl = fileImage ? fileImage.path : null; // URL của image (ảnh)

    // Lấy thông tin bài hát từ database
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy Product với ID này" });
    }

    if (fileImage && product.urlImage) {
      // Xóa ảnh cũ trên Cloudinary
      const publicId =
        "ImageWebcafe/" + product.urlImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Chỉ thêm vào updateData những field nào có dữ liệu
    const updateData = {};
    if (nameProduct) updateData.nameProduct = nameProduct;
    if (price) updateData.price = Number(price);
    if (imageUrl) updateData.urlImage = imageUrl;

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (updatedProduct) {
      res
        .status(200)
        .json({ message: "Cập nhật thành công!", product: updatedProduct });
    } else {
      res
        .status(404)
        .json({ message: "Không tìm thấy id Product để cập nhật" });
    }
  } catch (error) {
    console.log(error);

    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật Product", error: error.message });
  }
});

//@desc adminAuth
//@route delete /api/cashier/deleteProduct/:id
//@access private
const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin bài hát từ database
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy Product với ID này" });
    }
    // Xoá file ảnh trên Cloudinary (nếu có)
    if (product.urlImage) {
      const publicIdImg =
        "ImageWebcafe/" + product.urlImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicIdImg);
    }
    // Xoá khỏi database
    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Xoá Product thành công", success: true });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi xoá Product", error: error.message });
  }
});
module.exports = { GetAllData, uploadProduct, updateProduct, deleteProduct };
