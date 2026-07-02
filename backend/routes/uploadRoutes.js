const path = require("path");
const multer = require("multer");
const express = require("express");
const { protect, seller } = require("../middleware/auth");

// Image uploads. Two interchangeable backends behind the same endpoint:
//   • default     — saved to public/images and served at /images/<file>
//   • Cloudinary  — used automatically when CLOUDINARY_URL is set (durable,
//                   CDN-delivered; required once you deploy, since a hosted
//                   filesystem is ephemeral)
//
// To turn on Cloudinary later — no frontend changes needed:
//   1. cd backend && npm i cloudinary
//   2. add to .env:  CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
//      (copy it verbatim from your Cloudinary dashboard → it self-configures)
//   3. restart the server
// The product `image` field already stores a full URL as-is, so a Cloudinary
// https URL flows through the rest of the app unchanged.

const cloudEnabled = Boolean(process.env.CLOUDINARY_URL);

// Cloudinary needs the raw bytes → memory storage; disk backend writes a file.
const storage = cloudEnabled
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: path.join(__dirname, "..", "public", "images"),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".png";
        const safe = `upload_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, safe);
      },
    });

const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

// Upload a buffer to Cloudinary (lazy-required so the dep is only needed when
// CLOUDINARY_URL is set). Resolves to the secure CDN URL.
const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const cloudinary = require("cloudinary").v2; // reads CLOUDINARY_URL from env
    const stream = cloudinary.uploader.upload_stream(
      { folder: "shopper/products" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

const router = express.Router();

// POST /api/uploads  (approved seller or admin)  field: "image"
// Returns { filename, url } — store `url` on the product's image field.
router.post("/", protect, seller, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });

  if (cloudEnabled) {
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      return res
        .status(201)
        .json({ filename: result.public_id, url: result.secure_url });
    } catch (err) {
      return res.status(502).json({ message: "Image upload failed" });
    }
  }

  const url = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
  res.status(201).json({ filename: req.file.filename, url });
});

module.exports = router;
