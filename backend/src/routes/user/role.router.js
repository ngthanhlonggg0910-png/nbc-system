import express from "express";
const router = express.Router();
import * as controller from "../../controllers/user/role.controller.js";
router.get(
  "/",
  // middleware.authorizePermissions("view_role"),
  controller.getRole,
);

router.post(
  "/create",
  // middleware.authorizePermissions("create_role"),
  controller.create,
);

router.patch(
  "/edit/:id",
  // middleware.authorizePermissions("edit_role"),
  controller.edit,
);

router.delete(
  "/deleted/:id",
  // middleware.authorizePermissions("delete_role"),
  controller.deleteRole,
);

router.patch(
  "/permissions",
  // middleware.authorizePermissions("permission_role"),
  controller.permission,
);

export default router;
