const DEFAULT_GATEWAY_PORT = 3001;
const DEFAULT_LEGACY_PORT = 3002;
const DEFAULT_PROXY_TIMEOUT_MS = 15000;

const toNumber = (value, fallback) => {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
};

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

const buildLegacyServiceUrl = () => {
  if (process.env.LEGACY_SERVICE_URL) {
    return normalizeBaseUrl(process.env.LEGACY_SERVICE_URL);
  }

  const legacyPort = toNumber(
    process.env.LEGACY_SERVICE_PORT,
    DEFAULT_LEGACY_PORT
  );
  return `http://127.0.0.1:${legacyPort}`;
};

const resolveGatewayConfig = (overrides = {}) => {
  const gatewayPort = toNumber(
    overrides.gatewayPort ?? process.env.GATEWAY_PORT ?? process.env.PORT,
    DEFAULT_GATEWAY_PORT
  );

  const legacyServiceUrl = normalizeBaseUrl(
    overrides.legacyServiceUrl ?? buildLegacyServiceUrl()
  );

  const proxyTimeoutMs = toNumber(
    overrides.proxyTimeoutMs ?? process.env.GATEWAY_PROXY_TIMEOUT_MS,
    DEFAULT_PROXY_TIMEOUT_MS
  );

  return {
    gatewayPort,
    legacyServiceUrl,
    proxyTimeoutMs,
  };
};

module.exports = {
  DEFAULT_GATEWAY_PORT,
  DEFAULT_LEGACY_PORT,
  DEFAULT_PROXY_TIMEOUT_MS,
  resolveGatewayConfig,
};
