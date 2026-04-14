const timingSafeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
};

const readBearerToken = (req) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return "";
  }
  return token.trim();
};

const reindexAuth = (config) => (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const expected = config.reindexApiKey;
  if (!expected) {
    const err = new Error("Reindex is disabled (ASSISTANT_REINDEX_API_KEY is not set)");
    err.statusCode = 503;
    err.code = "ASSISTANT_REINDEX_DISABLED";
    return next(err);
  }

  const headerToken = req.headers["x-assistant-reindex-token"];
  const bearer = readBearerToken(req);
  const provided = typeof headerToken === "string" && headerToken ? headerToken : bearer;

  if (!provided || !timingSafeEqual(provided, expected)) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    err.code = "ASSISTANT_REINDEX_UNAUTHORIZED";
    return next(err);
  }

  return next();
};

module.exports = {
  reindexAuth,
};
