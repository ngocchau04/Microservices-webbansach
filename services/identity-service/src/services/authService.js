const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const { signAccessToken, verifyAccessToken } = require("./tokenService");
const { sendEmail } = require("./emailService");
const { sendVerificationEmail } = require("./notificationClient");
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

const generateVerificationCode = () =>
  `${Math.floor(Math.random() * 1000000)}`.padStart(6, "0");

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

const register = async ({ payload, config }) => {
  const { name, sdt = "", email, password } = payload;
  const validationError = validateRegisterInput({ name, email, password });

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const existingUser = await User.findOne({ email });
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

  const existingPending = await PendingUser.findOne({ email });
  if (existingPending) {
    return {
      ok: false,
      statusCode: 409,
      message: "Email is pending verification",
      code: "AUTH_EMAIL_PENDING_VERIFICATION",
      legacy: {
        status: "failed",
        message: "Email da dang ky nhung chua duoc xac thuc",
      },
    };
  }

  const verificationCode = generateVerificationCode();
  await PendingUser.create({
    email,
    name,
    password,
    sdt,
    role: "user",
    verificationCode,
  });

  await sendVerificationEmail({
    config,
    email,
    name,
    verificationCode,
    idempotencyKey: `identity-register-${email.toLowerCase()}`,
  });

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Check your email to verify your account" },
    legacy: {
      status: "success",
      message: "Kiem tra email de kich hoat tai khoan",
    },
  };
};

const checkPendingEmail = async ({ email }) => {
  if (!isEmail(email)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const pending = await PendingUser.findOne({ email }, { password: 0 });
  if (pending) {
    return {
      ok: true,
      statusCode: 200,
      data: { user: pending },
      legacy: { status: "success", user: pending },
    };
  }

  const user = await User.findOne({ email }, { password: 0 });
  if (user) {
    return {
      ok: false,
      statusCode: 409,
      message: "Email already registered. Please login.",
      code: "AUTH_EMAIL_EXISTS",
      legacy: {
        status: "failed",
        message: "Email da dang ky. Hay dang nhap.",
      },
    };
  }

  return {
    ok: false,
    statusCode: 404,
    message: "Email not found",
    code: "AUTH_EMAIL_NOT_FOUND",
    legacy: { status: "failed", message: "Email not found" },
  };
};

const resendVerification = async ({ email, config }) => {
  if (!isEmail(email)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const pending = await PendingUser.findOne({ email });
  if (!pending) {
    return {
      ok: false,
      statusCode: 404,
      message: "Email not found",
      code: "AUTH_EMAIL_NOT_FOUND",
      legacy: { status: "failed", message: "Email not found" },
    };
  }

  await sendVerificationEmail({
    config,
    email,
    name: pending.name,
    verificationCode: pending.verificationCode,
    idempotencyKey: `identity-resend-${email.toLowerCase()}-${pending.verificationCode}`,
  });

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Verification code sent" },
    legacy: {
      status: "success",
      message: "Ma xac thuc da duoc gui",
    },
  };
};

const verifyAccount = async ({ email, number, code }) => {
  if (!isEmail(email)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const verificationCode = `${number || code || ""}`.trim();
  if (!verificationCode) {
    return {
      ok: false,
      statusCode: 400,
      message: "Verification code is required",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const pending = await PendingUser.findOne({ email, verificationCode });
  if (!pending) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid verification code",
      code: "AUTH_INVALID_VERIFICATION_CODE",
      legacy: {
        status: "failed",
        message: "Ma xac minh chua chinh xac",
      },
    };
  }

  const existingUser = await User.findOne({ email: pending.email });
  if (existingUser) {
    await PendingUser.deleteOne({ _id: pending._id });
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
    name: pending.name,
    sdt: pending.sdt,
    email: pending.email,
    password: pending.password,
    role: pending.role || "user",
  });
  await PendingUser.deleteOne({ _id: pending._id });

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Account verified successfully" },
    legacy: {
      status: "success",
      message: "Tai khoan da duoc kich hoat",
    },
  };
};

const login = async ({ username, email, password, config }) => {
  const loginEmail = (username || email || "").trim();

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
  if (!isEmail(email)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Email is invalid",
      code: "AUTH_VALIDATION_ERROR",
    };
  }

  const user = await User.findOne({ email });
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
    to: email,
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
  checkPendingEmail,
  resendVerification,
  verifyAccount,
  login,
  refreshToken,
  forgotPassword,
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
