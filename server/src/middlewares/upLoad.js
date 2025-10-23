const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { cloudinary } = require("../configs/cloudinaryConfig");

// Cấu hình storage chỉ cho phép upload ảnh
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ImageWebcafe", // Tên folder trên Cloudinary
    resource_type: "image", // Chỉ upload ảnh
    allowed_formats: ["jpg", "png", "jpeg", "webp"], // Các định dạng ảnh được phép
  },
});

// Tạo middleware upload (chỉ cho 1 file image)
const upload = multer({ storage });

const uploadImageMiddleware = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    try {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res
          .status(400)
          .json({ message: "File upload error: " + err.message });
      } else if (err) {
        console.error("Unknown error:", err);
        return res
          .status(500)
          .json({ message: "An unexpected error occurred" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      req.image = req.file; // Gắn file image vào request để controller dùng
      console.log("Image uploaded:", req.image);

      next();
    } catch (error) {
      console.error("Error during file upload:", error);
      res.status(500).json({ message: "Error during file upload." });
    }
  });
};

module.exports = uploadImageMiddleware;
