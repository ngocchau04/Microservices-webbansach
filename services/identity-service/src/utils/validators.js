const isEmail = (value) =>
  typeof value === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const hasMinLength = (value, min) =>
  typeof value === "string" && value.trim().length >= min;

const pickProfileUpdates = (payload = {}) => {
  const updates = {};

  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim();
  }
  if (typeof payload.sdt === "string" && payload.sdt.trim()) {
    updates.sdt = payload.sdt.trim();
  }
  if (typeof payload.phone === "string" && payload.phone.trim()) {
    updates.sdt = payload.phone.trim();
  }
  if (typeof payload.password === "string" && payload.password.trim()) {
    updates.password = payload.password.trim();
  }

  return updates;
};

module.exports = {
  isEmail,
  hasMinLength,
  pickProfileUpdates,
};
