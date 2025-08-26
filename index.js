const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Ensure data files exist
const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const MEDIA_FILE = path.join(DATA_DIR, 'media.json');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return {}; }
}
function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf-8');
}

// Serve static media
app.use('/media', express.static(path.join(__dirname, 'media')));

// Swagger
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ---------- Content Endpoints ----------
app.get('/api/content', (req, res) => {
  const content = readJSON(CONTENT_FILE);
  res.json(content);
});

app.post('/api/content', (req, res) => {
  const { title, subtitle, about } = req.body || {};
  const content = readJSON(CONTENT_FILE);
  const updated = {
    ...content,
    ...(title !== undefined ? { title } : {}),
    ...(subtitle !== undefined ? { subtitle } : {}),
    ...(about !== undefined ? { about } : {}),
    updatedAt: new Date().toISOString()
  };
  writeJSON(CONTENT_FILE, updated);
  res.json(updated);
});

// ---------- Upload Helpers ----------
function makeUploader(folder) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'media', folder));
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, unique + ext);
    }
  });
  return multer({ storage });
}

const imageUpload = makeUploader('images');
const videoUpload = makeUploader('videos');
const pdfUpload   = makeUploader('pdfs');

function addToManifest(kind, files, req) {
  const manifest = readJSON(MEDIA_FILE);
  if (!manifest.images) manifest.images = [];
  if (!manifest.videos) manifest.videos = [];
  if (!manifest.pdfs) manifest.pdfs = [];

  const base = `${req.protocol}://${req.get('host')}`;
  const arr = files.map(f => ({
    filename: f.filename,
    src: `/media/${kind}/${f.filename}`,
    url: `${base}/media/${kind}/${f.filename}`,
    uploadedAt: new Date().toISOString()
  }));

  manifest[kind] = [...arr, ...manifest[kind]]; // prepend newest
  writeJSON(MEDIA_FILE, manifest);
  return arr;
}

// ---------- Media GET ----------
app.get('/api/images', (req, res) => {
  const manifest = readJSON(MEDIA_FILE);
  const base = `${req.protocol}://${req.get('host')}`;
  const images = (manifest.images || []).map(i => ({ ...i, url: i.url || base + i.src }));
  res.json(images);
});

app.get('/api/videos', (req, res) => {
  const manifest = readJSON(MEDIA_FILE);
  const base = `${req.protocol}://${req.get('host')}`;
  const videos = (manifest.videos || []).map(i => ({ ...i, url: i.url || base + i.src }));
  res.json(videos);
});

app.get('/api/pdfs', (req, res) => {
  const manifest = readJSON(MEDIA_FILE);
  const base = `${req.protocol}://${req.get('host')}`;
  const pdfs = (manifest.pdfs || []).map(i => ({ ...i, url: i.url || base + i.src }));
  res.json(pdfs);
});

// ---------- Media POST (uploads) ----------
app.post('/api/images', imageUpload.array('files', 20), (req, res) => {
  const saved = addToManifest('images', req.files || [], req);
  res.status(201).json(saved);
});

app.post('/api/videos', videoUpload.array('files', 10), (req, res) => {
  const saved = addToManifest('videos', req.files || [], req);
  res.status(201).json(saved);
});

app.post('/api/pdfs', pdfUpload.array('files', 30), (req, res) => {
  const saved = addToManifest('pdfs', req.files || [], req);
  res.status(201).json(saved);
});

app.get('/', (req, res) => {
  res.send('Divine API is running. See /api-docs for Swagger.');
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
