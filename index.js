const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary"); // <-- your cloudinary.js file

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Swagger
const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ---------- Multer Cloudinary Setup ----------
function makeCloudinaryUploader(kind) {
  return multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => {
        let resource_type = "image";
        if (file.mimetype.includes("video")) resource_type = "video";
        if (file.mimetype.includes("pdf")) resource_type = "raw"; // Cloudinary treats PDFs as raw

        return {
          folder: `divine/${kind}`,
          resource_type,
          public_id: file.originalname.split(".")[0], // use original name (no ext)
          format: file.originalname.split(".").pop(), // preserve ext
        };
      },
    }),
  });
}

const imageUpload = makeCloudinaryUploader("images");
const videoUpload = makeCloudinaryUploader("videos");
const pdfUpload = makeCloudinaryUploader("pdfs");

// ---------- Media Upload Endpoints ----------
app.post("/api/images", imageUpload.array("files", 20), (req, res) => {
  const uploaded = req.files.map((f) => ({
    url: f.path, // Cloudinary URL
    kind: "image",
    uploadedAt: new Date().toISOString(),
  }));
  res.status(201).json(uploaded);
});

app.post("/api/videos", videoUpload.array("files", 10), (req, res) => {
  const uploaded = req.files.map((f) => ({
    url: f.path,
    kind: "video",
    uploadedAt: new Date().toISOString(),
  }));
  res.status(201).json(uploaded);
});

app.post("/api/pdfs", pdfUpload.array("files", 30), (req, res) => {
  const uploaded = req.files.map((f) => ({
    url: f.path,
    kind: "pdf",
    uploadedAt: new Date().toISOString(),
  }));
  res.status(201).json(uploaded);
});

// ---------- Media GET Endpoints (Live from Cloudinary) ----------
app.get("/api/images", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      prefix: "divine/images", // folder path
      max_results: 50,
    });
    const images = result.resources.map((r) => ({
      public_id: r.public_id,
      url: r.secure_url,
      uploadedAt: r.created_at,
    }));
    res.json(images);
  } catch (err) {
    console.error("Error fetching images:", err);
    res.status(500).json({ error: "Cloudinary fetch failed" });
  }
});

app.get("/api/videos", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: "video",
      prefix: "divine/videos",
      max_results: 50,
    });
    const videos = result.resources.map((r) => ({
      public_id: r.public_id,
      url: r.secure_url,
      uploadedAt: r.created_at,
    }));
    res.json(videos);
  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ error: "Cloudinary fetch failed" });
  }
});

app.get("/api/pdfs", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: "raw", // pdfs go as raw
      prefix: "divine/pdfs",
      max_results: 50,
    });
    const pdfs = result.resources.map((r) => ({
      public_id: r.public_id,
      url: r.secure_url,
      uploadedAt: r.created_at,
    }));
    res.json(pdfs);
  } catch (err) {
    console.error("Error fetching pdfs:", err);
    res.status(500).json({ error: "Cloudinary fetch failed" });
  }
});

// ---------- Root ----------
app.get("/", (req, res) => {
  res.send("Divine API is running. See /api-docs for Swagger.");
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
