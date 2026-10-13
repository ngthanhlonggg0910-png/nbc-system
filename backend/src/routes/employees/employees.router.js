import express from "express";
import {
  deleteEmployee,
  editEmployee,
  getEmployee,
  getEmployees,
} from "../../controllers/employees/employees.controller.js";
import {
  authorizePermissions,
  isAuthenticated,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(isAuthenticated);
router.get("/", authorizePermissions("view_employee"), getEmployees);
router.get("/:staffId", authorizePermissions("view_employee"), getEmployee);
router.patch(
  "/edit/:staffId",
  authorizePermissions("edit_employee"),
  editEmployee,
);
router.delete(
  "/deleted/:staffId",
  authorizePermissions("delete_employee"),
  deleteEmployee,
);

export default router;
