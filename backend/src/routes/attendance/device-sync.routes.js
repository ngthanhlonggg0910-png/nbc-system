import { Router } from "express";

import {
  syncAttendanceDevice,
  syncAllAttendanceDevices,
} from "../../controllers/attendance/device-sync.controller.js";

const router = Router();

router.post("/sync-all", syncAllAttendanceDevices);
router.post("/:device_id/sync", syncAttendanceDevice);

export default router;
