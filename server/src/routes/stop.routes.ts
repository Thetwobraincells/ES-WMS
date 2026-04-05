import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { completeStop, skipStop, uploadPhoto, skipStopSchema, uploadPhotoSchema } from "../controllers/stop.controller";
import { env } from "../config/env";
import { UserRole } from "@prisma/client";

const router = Router();

// ─── Multer config for photo uploads ────────────────────────────────────────
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed."));
    }
  },
});

// All stop endpoints require driver auth
router.use(authenticate);

// PATCH /api/v1/stops/:id/complete — Mark stop as completed
router.patch("/:id/complete", requireRole(UserRole.DRIVER), completeStop);

// PATCH /api/v1/stops/:id/skip — Skip stop with reason
router.patch("/:id/skip", requireRole(UserRole.DRIVER), validate(skipStopSchema), skipStop);

// POST /api/v1/stops/:id/photos — Upload geotagged photo
router.post(
  "/:id/photos",
  requireRole(UserRole.DRIVER),
  upload.single("photo"),
  validate(uploadPhotoSchema),
  uploadPhoto
);

export default router;
