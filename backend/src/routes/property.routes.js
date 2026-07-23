import express from "express";
import {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  getHostProperties,
} from "../controllers/property.controllers.js";
import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";
const router = express.Router();

router.post(
  "/",
  protect,
  authorize("host"),
  upload.array("images", 10),
  createProperty,
);

router.patch(
  "/:id",
  protect,
  authorize("host", "admin"),
  upload.array("images", 10),
  updateProperty,
);

router.delete("/:id", protect, authorize("host", "admin"), deleteProperty);
router.patch("/:id/status", protect, authorize("admin"), updatePropertyStatus);
router.get(
  "/host/my-properties",
  protect,
  authorize("host"),
  getHostProperties,
);
router.get("/", getAllProperties);
router.get("/:id", getPropertyById);
export default router;
