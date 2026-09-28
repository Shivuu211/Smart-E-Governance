import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { connectToMongoDB } from "./db";
import apiRouter from "./routes/api";

// Load environment variables
dotenv.config();

async function startServer() {
  // Connect to MongoDB first (Primary & Only Runtime Database)
  await connectToMongoDB();

  const app = express();
  const PORT = 3000;

  // Ensure persistent uploads directories exist
  const uploadsPath = path.join(process.cwd(), "data/uploads");
  const videoUploadsPath = path.join(uploadsPath, "videos");
  if (!fs.existsSync(videoUploadsPath)) {
    fs.mkdirSync(videoUploadsPath, { recursive: true });
  }

  // Middlewares for parsing request bodies
  app.use(express.json({ limit: "32mb" }));
  app.use(express.urlencoded({ limit: "32mb", extended: true }));

  // API Routes
  app.use("/api", apiRouter);

  // Root healthcheck
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      database: "mongodb",
      databaseName: "namma_panchayath",
      compassInspection: "mongodb://127.0.0.1:27017/namma_panchayath",
      timestamp: new Date().toISOString()
    });
  });

  // Explicit static file serving for persistent user uploads (videos, documents)
  app.use("/uploads", express.static(uploadsPath, { maxAge: "1d", acceptRanges: true }));

  // Explicit static file serving for public assets and media streaming
  const publicPath = path.join(process.cwd(), "frontend/public");
  app.use("/assets", express.static(path.join(publicPath, "assets"), { maxAge: "1d", acceptRanges: true }));
  app.use(express.static(publicPath, { maxAge: "1d", acceptRanges: true }));

  // API Error handling middleware (catches any payload or unhandled errors on /api)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      console.error("API error captured:", req.method, req.path, err);
      if (err.status === 413 || err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Request payload exceeds the 28MB upload limit. Please upload a smaller video.' });
      }
      return res.status(err.status || 500).json({
        message: err.message || 'An internal server error occurred.'
      });
    }
    next(err);
  });

  // Serve static assets or mount Vite Dev Middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development server with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting production server...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Namma Panchayath System running at http://localhost:${PORT}`);
    console.log(`Runtime Database: MongoDB namma_panchayath (Inspect via MongoDB Compass: ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/namma_panchayath'})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start the Express full-stack server:", err);
});
