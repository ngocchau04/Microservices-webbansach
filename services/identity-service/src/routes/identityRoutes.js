const express = require("express");
const { healthCheck, readyCheck } = require("../controllers/healthController");
const authController = require("../controllers/authController");
const profileController = require("../controllers/profileController");
const adminUserController = require("../controllers/adminUserController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const createIdentityRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authMiddleware(config);

  router.get("/health", healthCheck);
  router.get("/ready", readyCheck);

  router.post("/register", asyncHandler(authController.register));
  router.post("/login", asyncHandler(authController.login));
  router.post("/refresh-token", asyncHandler(authController.refreshToken));
  router.post("/google-login", asyncHandler(authController.googleLogin));

  router.post("/forgot-password", asyncHandler(authController.forgotPassword));
  router.post("/reset-password", asyncHandler(authController.resetPassword));

  router.get("/me", requireAuth, asyncHandler(profileController.getMe));
  router.put("/me", requireAuth, asyncHandler(profileController.updateMe));
  router.get("/favorites", requireAuth, asyncHandler(profileController.getFavorites));
  router.post("/favorites", requireAuth, asyncHandler(profileController.addFavorite));
  router.delete("/favorites", requireAuth, asyncHandler(profileController.removeFavorite));
  router.post(
    "/profile/:field(name|phone|password)",
    requireAuth,
    asyncHandler(profileController.updateProfileByField)
  );

  router.get(
    "/users/count",
    requireAuth,
    adminMiddleware,
    asyncHandler(adminUserController.countUsers)
  );
  router.get("/users", requireAuth, adminMiddleware, asyncHandler(adminUserController.listUsers));
  router.get("/users/:id", requireAuth, adminMiddleware, asyncHandler(adminUserController.getUserById));
  router.patch(
    "/users/:id/status",
    requireAuth,
    adminMiddleware,
    asyncHandler(adminUserController.updateUserStatus)
  );
  router.patch(
    "/users/:id",
    requireAuth,
    adminMiddleware,
    asyncHandler(adminUserController.updateUser)
  );
  router.delete(
    "/users/:id",
    requireAuth,
    adminMiddleware,
    asyncHandler(adminUserController.deleteUser)
  );

  return router;
};

module.exports = {
  createIdentityRoutes,
};
