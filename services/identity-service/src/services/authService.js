const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { signAccessToken, verifyAccessToken } = require("./tokenService");
const { sendEmail } = require("./emailService");
const {
  isEmail,
  hasMinLength,
  pickProfileUpdates,
} = require("../utils/validators");

const toPlainUser = (doc) => (doc ? doc.toObject() : null);
const normalizeFavoriteList = (favorite = []) =>
  Array.isArray(favorite)
    ? favorite
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") {
            return { product: item };
          }
          if (typeof item === "object" && typeof item.product === "string") {
            return { product: item.product };
          }
          if (typeof item === "object" && typeof item.favProId === "string") {
            return { product: item.favProId };
          }
          return null;
        })
        .filter(Boolean)
    : [];

const normalizeTenantId = (value, fallback = "public") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (!/^[a-z0-9_-]{1,64}$/.test(normalized)) {
    return fallback;
  }
  return normalized;
};

const validateRegisterInput = ({ name, email, password }) => {
  if (!hasMinLength(name, 2)) {
    return "Name must be at least 2 characters";
  }

  if (!isEmail(email)) {
    return "Email is invalid";
  }

  if (!hasMinLength(password, 6)) {
    return "Password must be at least 6 characters";
  }

  return null;
};

const register = async ({ payload }) => {
  const { name, sdt = "", email, password } = payload;
  const validationError = validateRegisterInput({ name, email, password });
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return {
      ok: false,
      statusCode: 409,
      message: "Email already exists",
      code: "AUTH_EMAIL_EXISTS",
      legacy: {
        status: "failed",
        message: "Email da ton tai",
      },
    };
  }

  await User.create({
    tenantId: normalizeTenantId("public"),
    email: normalizedEmail,
    name,
    password,
    sdt,
    role: "user",
    status: "active",
    isActive: true,
    authProvider: "local",
  });

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Account created successfully. Please login." },
    legacy: {
      status: "success",
      message: "Dang ky thanh cong. Hay dang nhap.",
    },
  };
};

const login = async ({ username, email, password, config }) => {
  const loginEmail = (username || email || "").trim().toLowerCase();

  if (!loginEmail || !password) {
    return {
      ok: false,
      statusCode: 400,
      message: "Username and password are required",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findOne({ email: loginEmail });
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
      legacy: { status: "fail", message: "User not found" },
    };
  }

  if (user.status !== "active" || user.isActive === false) {
    return {
      ok: false,
      statusCode: 403,
      message: "User is inactive",
      code: "AUTH_USER_INACTIVE",
      legacy: { status: "fail", message: "User is inactive" },
    };
  }

  if (user.password !== password) {
    return {
      ok: false,
      statusCode: 401,
      message: "Invalid credentials",
      code: "AUTH_INVALID_CREDENTIALS",
      legacy: { status: "fail", message: "Invalid credentials" },
    };
  }

  const token = signAccessToken({ user, config });
  const plainUser = toPlainUser(user);

  return {
    ok: true,
    statusCode: 200,
    data: { token, user: plainUser },
    legacy: { status: "success", token, user: plainUser },
  };
};

const refreshToken = async ({ token, config }) => {
  if (!token) {
    return {
      ok: false,
      statusCode: 400,
      message: "Token is required",
      code: "AUTH_TOKEN_REQUIRED",
    };
  }

  try {
    const decoded = verifyAccessToken({ token, config });
    const user = await User.findById(decoded.userId);

    if (!user) {
      return {
        ok: false,
        statusCode: 404,
        message: "User not found",
        code: "AUTH_USER_NOT_FOUND",
      };
    }

    const newToken = signAccessToken({ user, config });
    const plainUser = toPlainUser(user);

    return {
      ok: true,
      statusCode: 200,
      data: { token: newToken, user: plainUser },
      legacy: { token: newToken, user: plainUser },
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 401,
      message: "Invalid token",
      code: "AUTH_INVALID_TOKEN",
      legacy: { message: "Token khong hop le." },
    };
  }
};

const forgotPassword = async ({ email, config }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!isEmail(normalizedEmail)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "Email does not exist",
      code: "AUTH_EMAIL_NOT_FOUND",
      legacy: { status: "fail", message: "Email khong ton tai" },
    };
  }

  await sendEmail({
    config,
    to: normalizedEmail,
    subject: "Your password",
    text: `Your password is: ${user.password}`,
  });

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Password was sent to your email" },
    legacy: {
      status: "success",
      message: "Mat khau da duoc gui den email cua ban",
    },
  };
};

const resetPassword = async ({ email, newPassword, confirmPassword }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!isEmail(normalizedEmail)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  if (!hasMinLength(newPassword, 6)) {
    return {
      ok: false,
      statusCode: 400,
      message: "New password must be at least 6 characters",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      statusCode: 400,
      message: "Password confirmation does not match",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "Email does not exist",
      code: "AUTH_EMAIL_NOT_FOUND",
      legacy: { status: "fail", message: "Email khong ton tai" },
    };
  }

  await User.findOneAndUpdate({ email: normalizedEmail }, { password: newPassword }, { new: true });

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Password updated successfully. Please login." },
    legacy: {
      status: "success",
      message: "Mat khau da duoc cap nhat. Hay dang nhap.",
    },
  };
};

const googleLogin = async ({ payload, config }) => {
  const { idToken, email: fallbackEmail, name: fallbackName } = payload || {};
  let googleUser = null;

  if (idToken && config.googleClientId) {
    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const tokenPayload = ticket.getPayload();
    googleUser = {
      email: tokenPayload.email,
      name: tokenPayload.name || tokenPayload.email.split("@")[0],
    };
  } else if (fallbackEmail && isEmail(fallbackEmail)) {
    googleUser = {
      email: fallbackEmail.trim(),
      name: fallbackName || fallbackEmail.split("@")[0],
    };
  }

  if (!googleUser) {
    return {
      ok: false,
      statusCode: 400,
      message: "Google token or valid email is required",
      code: "AUTH_GOOGLE_TOKEN_REQUIRED",
    };
  }

  let user = await User.findOne({ email: googleUser.email });
  if (!user) {
    user = await User.create({
      tenantId: normalizeTenantId("public"),
      email: googleUser.email,
      name: googleUser.name,
      password: crypto.randomBytes(16).toString("hex"),
      role: "user",
      authProvider: "google",
    });
  }

  const token = signAccessToken({ user, config });
  const plainUser = toPlainUser(user);

  return {
    ok: true,
    statusCode: 200,
    data: { token, user: plainUser },
    legacy: { status: "success", token, user: plainUser },
  };
};

const getCurrentUser = async ({ userId }) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  const plainUser = toPlainUser(user);
  return {
    ok: true,
    statusCode: 200,
    data: { user: plainUser },
    legacy: { status: "success", user: plainUser },
  };
};

const updateCurrentUser = async ({ userId, payload }) => {
  const updates = pickProfileUpdates(payload);

  if (!Object.keys(updates).length) {
    return {
      ok: false,
      statusCode: 400,
      message: "No valid fields to update",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  if (updates.password && !hasMinLength(updates.password, 6)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Password must be at least 6 characters",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  const plainUser = toPlainUser(user);
  return {
    ok: true,
    statusCode: 200,
    data: { user: plainUser },
    legacy: { status: "success", user: plainUser },
  };
};

const updateUserByEmailField = async ({ email, field, value }) => {
  if (!isEmail(email)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  if (typeof value !== "string" || !value.trim()) {
    return {
      ok: false,
      statusCode: 400,
      message: "Updated value is required",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const updatesByField = {
    name: { name: value.trim() },
    phone: { sdt: value.trim() },
    password: { password: value.trim() },
  };

  const updates = updatesByField[field];
  if (!updates) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid profile field",
      code: "AUTH_INVALID_PROFILE_FIELD",
    };
  }

  if (field === "password" && !hasMinLength(value, 6)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Password must be at least 6 characters",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findOneAndUpdate({ email }, updates, { new: true });
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
      legacy: { status: "fail", message: "User not found" },
    };
  }

  const plainUser = toPlainUser(user);
  return {
    ok: true,
    statusCode: 200,
    data: { user: plainUser },
    legacy: { status: "success", user: plainUser },
  };
};

const getFavorites = async ({ userId }) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  const favorite = normalizeFavoriteList(user.favorite);
  user.favorite = favorite;
  await user.save();

  return {
    ok: true,
    statusCode: 200,
    data: { items: favorite },
    legacy: { favorite },
  };
};

const addFavorite = async ({ userId, productId }) => {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) {
    return {
      ok: false,
      statusCode: 400,
      message: "Product ID is required",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  const favorite = normalizeFavoriteList(user.favorite);
  const exists = favorite.some((item) => item.product === normalizedProductId);
  if (!exists) {
    favorite.push({ product: normalizedProductId });
    user.favorite = favorite;
    await user.save();
  }

  return {
    ok: true,
    statusCode: 200,
    data: { items: favorite },
    legacy: { favorite },
  };
};

const removeFavorite = async ({ userId, productId }) => {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) {
    return {
      ok: false,
      statusCode: 400,
      message: "Product ID is required",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  const favorite = normalizeFavoriteList(user.favorite).filter(
    (item) => item.product !== normalizedProductId
  );
  user.favorite = favorite;
  await user.save();

  return {
    ok: true,
    statusCode: 200,
    data: { items: favorite },
    legacy: { favorite },
  };
};

/** Roles that should not appear in customer-facing admin lists (e.g. Khách hàng). */
const NON_CUSTOMER_ROLES = ["admin"];

const listUsers = async () => {
  const users = await User.find({ role: { $nin: NON_CUSTOMER_ROLES } }).sort({ createdAt: -1 });
  return {
    ok: true,
    statusCode: 200,
    data: { users, total: users.length },
    legacy: { status: "success", accs: users },
  };
};

const countUsers = async () => {
  const total = await User.countDocuments({ role: { $nin: NON_CUSTOMER_ROLES } });

  return {
    ok: true,
    statusCode: 200,
    data: { total },
    legacy: { total },
  };
};

const getUserById = async ({ userId }) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: { user },
  };
};

const updateUserStatus = async ({ userId, status, isActive }) => {
  const updates = {};

  if (typeof status === "string" && status.trim()) {
    updates.status = status.trim();
    if (updates.status === "active") {
      updates.isActive = true;
    }
    if (updates.status === "inactive") {
      updates.isActive = false;
    }
  }

  if (typeof isActive === "boolean") {
    updates.isActive = isActive;
    updates.status = isActive ? "active" : "inactive";
  }

  if (!Object.keys(updates).length) {
    return {
      ok: false,
      statusCode: 400,
      message: "status or isActive is required",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: { user },
  };
};

const updateUserByAdmin = async ({ userId, payload = {} }) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  if (String(user.role || "").toLowerCase() === "admin") {
    return {
      ok: false,
      statusCode: 403,
      message: "Cannot edit admin account from customer management",
      code: "AUTH_FORBIDDEN",
    };
  }

  const next = {};

  if (typeof payload.name === "string" && payload.name.trim()) {
    next.name = payload.name.trim();
  }

  if (typeof payload.sdt === "string") {
    next.sdt = payload.sdt.trim();
  }

  if (typeof payload.email === "string" && payload.email.trim()) {
    const nextEmail = payload.email.trim().toLowerCase();
    if (!isEmail(nextEmail)) {
      return {
        ok: false,
        statusCode: 400,
        message: "Email is invalid",
        code: "AUTH_VALIDATION_ERROR",
      };
    }
    if (nextEmail !== String(user.email || "").toLowerCase()) {
      const existing = await User.findOne({ email: nextEmail });
      if (existing) {
        return {
          ok: false,
          statusCode: 409,
          message: "Email already exists",
          code: "AUTH_EMAIL_EXISTS",
        };
      }
    }
    next.email = nextEmail;
  }

  if (!Object.keys(next).length) {
    return {
      ok: false,
      statusCode: 400,
      message: "No valid fields to update",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const updated = await User.findByIdAndUpdate(userId, next, { new: true });
  return {
    ok: true,
    statusCode: 200,
    data: { user: updated },
  };
};

const deleteUserByAdmin = async ({ userId }) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      ok: false,
      statusCode: 404,
      message: "User not found",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  if (String(user.role || "").toLowerCase() === "admin") {
    return {
      ok: false,
      statusCode: 403,
      message: "Cannot delete admin account from customer management",
      code: "AUTH_FORBIDDEN",
    };
  }

  await User.findByIdAndDelete(userId);
  return {
    ok: true,
    statusCode: 200,
    data: { deleted: true, userId },
  };
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  googleLogin,
  getCurrentUser,
  updateCurrentUser,
  updateUserByEmailField,
  listUsers,
  countUsers,
  getUserById,
  updateUserStatus,
  updateUserByAdmin,
  deleteUserByAdmin,
  getFavorites,
  addFavorite,
  removeFavorite,
};
