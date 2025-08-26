# Divine Backend (Express API)

APIs to manage images, videos, PDFs and site content with uploads + Swagger docs.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:5000/api-docs
```

## Endpoints

- GET  /api/content
- POST /api/content           # body: { title, subtitle, about }

- GET  /api/images
- POST /api/images            # multipart/form-data, field: files

- GET  /api/videos
- POST /api/videos            # multipart/form-data, field: files

- GET  /api/pdfs
- POST /api/pdfs              # multipart/form-data, field: files

Static files are served at `/media/*`.

## Deployment (Render.com example)
- Create a new Web Service from this repo.
- Build command: `npm install`
- Start command: `node index.js`
- Add a "Persistent Disk" if you want uploaded files to persist across deploys.
