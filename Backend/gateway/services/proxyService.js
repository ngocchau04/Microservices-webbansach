const http = require("http");
const https = require("https");
const { URL } = require("url");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const buildForwardHeaders = (reqHeaders, req, targetHost) => {
  const headers = { ...reqHeaders, host: targetHost };
  const forwardedFor = req.headers["x-forwarded-for"];
  const remoteAddress = req.socket?.remoteAddress;

  headers["x-forwarded-for"] = [forwardedFor, remoteAddress]
    .filter(Boolean)
    .join(", ");
  headers["x-forwarded-host"] = req.headers.host || "";
  headers["x-forwarded-proto"] = req.protocol || "http";

  return headers;
};

const copyProxyHeadersToResponse = (sourceHeaders, res) => {
  Object.entries(sourceHeaders).forEach(([key, value]) => {
    if (!value || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    res.setHeader(key, value);
  });
};

const proxyToLegacy = (req, res, config) =>
  new Promise((resolve, reject) => {
    const targetUrl = new URL(req.originalUrl || req.url, config.legacyServiceUrl);
    const isHttps = targetUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const proxyRequest = transport.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        method: req.method,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        headers: buildForwardHeaders(req.headers, req, targetUrl.host),
        timeout: config.proxyTimeoutMs,
      },
      (proxyResponse) => {
        res.status(proxyResponse.statusCode || 502);
        copyProxyHeadersToResponse(proxyResponse.headers, res);
        proxyResponse.pipe(res);
        proxyResponse.on("end", resolve);
      }
    );

    proxyRequest.on("timeout", () => {
      proxyRequest.destroy(new Error("Proxy request timed out"));
    });

    proxyRequest.on("error", (error) => {
      reject(error);
    });

    req.on("aborted", () => {
      proxyRequest.destroy(new Error("Client aborted request"));
    });

    req.pipe(proxyRequest);
  });

module.exports = {
  proxyToLegacy,
};
