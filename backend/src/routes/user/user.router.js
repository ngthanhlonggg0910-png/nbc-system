import { Router } from "express";
import {
  forgotPassword,
  getProfile,
  login,
  logout,
  updateProfile,
  getResetPasswordRequests,
  resetPassword,
  changePassword,
  uploadAvatar,
} from "../../controllers/user/user.controller.js";
import { uploadAvatarMiddleware } from "../../middleware/avatar-upload.middleware.js";
import {
  registerChallenge,
  registerVerify,
  loginChallenge,
  loginVerify,
} from "../../controllers/user/webauthn.controller.js";
import {
  generate,
  scan,
  confirm,
  cancel,
  poll,
} from "../../controllers/user/qr-login.controller.js";
import { login as validateLogin } from "../../../validates/auth.validate.js";
import { isAuthenticated } from "../../middleware/authMiddleware.js";

const router = Router();
//auth
router.post("/login", validateLogin, login);
router.get("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.get("/reset-pass/all", isAuthenticated, getResetPasswordRequests);
router.patch("/reset-pass/:id", isAuthenticated, resetPassword);

// WebAuthn
router.post("/webauthn/register/challenge", isAuthenticated, registerChallenge);
router.post("/webauthn/register/verify", isAuthenticated, registerVerify);
router.post("/webauthn/challenge", loginChallenge);
router.post("/webauthn/verify", loginVerify);

// QR Login
router.post("/qr/generate", generate);
router.post("/qr/scan", isAuthenticated, scan);
router.post("/qr/confirm", isAuthenticated, confirm);
router.post("/qr/cancel", isAuthenticated, cancel);
router.get("/qr/poll/:sessionId", poll);

//profile
router.get("/profile", isAuthenticated, getProfile);
router.get("/profile/me", isAuthenticated, getProfile);
router.put("/profile/me", isAuthenticated, updateProfile);
router.patch("/profile/edit", isAuthenticated, updateProfile);
router.put("/profile/change-password", isAuthenticated, changePassword);
router.post(
  "/profile/avatar",
  isAuthenticated,
  uploadAvatarMiddleware,
  uploadAvatar,
);

export default router;
