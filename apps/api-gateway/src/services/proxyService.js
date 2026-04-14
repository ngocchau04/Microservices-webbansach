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

const setForwardHeaders = (requestHeaders, req, upstreamHost) => {
  const headers = { ...requestHeaders, host: upstreamHost };
  const existingForwardedFor = req.headers["x-forwarded-for"];
  const remoteAddress = req.socket?.remoteAddress;

  headers["x-forwarded-for"] = [existingForwardedFor, remoteAddress]
    .filter(Boolean)
    .join(", ");
  headers["x-forwarded-host"] = req.headers.host || "";
  headers["x-forwarded-proto"] = req.protocol || "http";
  headers["x-request-id"] = req.requestId || req.headers["x-request-id"] || "";

  return headers;
};

const copyResponseHeaders = (upstreamHeaders, res) => {
  Object.entries(upstreamHeaders).forEach(([key, value]) => {
    if (!value || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    res.setHeader(key, value);
  });
};

const canForwardParsedBody = (req) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return false;
  }

  if (!req.body || typeof req.body !== "object") {
    return false;
  }

  return Object.keys(req.body).length > 0;
};

const proxyRequest = ({ req, res, config, upstreamPath, upstreamBaseUrl }) =>
  new Promise((resolve, reject) => {
    const upstreamUrl = new URL(upstreamPath, upstreamBaseUrl);
    const isHttps = upstreamUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const upstreamReq = transport.request(
      {
        protocol: upstreamUrl.protocol,
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port || (isHttps ? 443 : 80),
        method: req.method,
        path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
        headers: setForwardHeaders(req.headers, req, upstreamUrl.host),
        timeout: config.timeoutMs,
      },
      (upstreamRes) => {
        res.status(upstreamRes.statusCode || 502);
        copyResponseHeaders(upstreamRes.headers, res);
        upstreamRes.pipe(res);
        upstreamRes.on("end", resolve);
      }
    );

    upstreamReq.on("timeout", () => {
      upstreamReq.destroy(new Error("Proxy request timed out"));
    });
    upstreamReq.on("error", reject);

    req.on("aborted", () => {
      upstreamReq.destroy(new Error("Client aborted request"));
    });

    if (canForwardParsedBody(req)) {
      const payload = Buffer.from(JSON.stringify(req.body));
      upstreamReq.setHeader("content-length", payload.length);
      upstreamReq.write(payload);
      upstreamReq.end();
      return;
    }

    if (req.readableEnded) {
      upstreamReq.end();
      return;
    }

    req.pipe(upstreamReq);
  });

module.exports = {
  proxyRequest,
};
