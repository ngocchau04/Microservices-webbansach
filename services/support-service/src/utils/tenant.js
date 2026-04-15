const TENANT_ID_REGEX = /^[a-z0-9_-]{1,64}$/;

const normalizeTenantId = (value, fallback = "public") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (!TENANT_ID_REGEX.test(normalized)) {
    return fallback;
  }
  return normalized;
};

module.exports = {
  normalizeTenantId,
};
