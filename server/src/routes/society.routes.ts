import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  getSocietyStatus,
  submitComplaint,
  listSocieties,
  getSocietyFines,
  getSocietyComplianceEndpoint,
  complaintSchema,
} from "../controllers/society.controller";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";

const router = Router();

// Multer config for complaint photos
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) =>
      cb(null, `complaint-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG and PNG images are allowed."));
  },
});

router.use(authenticate);

// GET /api/v1/societies — Admin: list all societies
router.get("/", requireRole(UserRole.ADMIN), listSocieties);

// GET /api/v1/societies/:id/status — Citizen: today's collection status (embeds compliance score)
router.get("/:id/status", requireRole(UserRole.CITIZEN, UserRole.ADMIN), getSocietyStatus);

// GET /api/v1/societies/:id/compliance — Citizen: detailed compliance score — FR-CIT-04
router.get("/:id/compliance", requireRole(UserRole.CITIZEN, UserRole.ADMIN), getSocietyComplianceEndpoint);

// GET /api/v1/societies/:id/fines — Citizen: fine history + wallet — FR-CIT-05
router.get("/:id/fines", requireRole(UserRole.CITIZEN, UserRole.ADMIN), getSocietyFines);

// POST /api/v1/societies/:id/complaint — Citizen: submit complaint with optional photo — FR-CIT-03
router.post(
  "/:id/complaint",
  requireRole(UserRole.CITIZEN),
  upload.single("photo"),
  validate(complaintSchema),
  submitComplaint
);

export default router;
