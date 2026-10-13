import { Router } from "express";
import {
  getAllDevices,
  updateDevice,
  getDeviceById,
  createDevice,
} from "../../controllers/attendance/device.controller.js";

const router = Router();

router.get("/", getAllDevices);

router.get("/:id", getDeviceById);

router.post("/", createDevice);

router.patch("/:id", updateDevice);

export default router;
