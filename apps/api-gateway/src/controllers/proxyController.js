const {
  resolveProxyRoute,
  resolveTargetBaseUrl,
} = require("../services/pathRewriteService");
const { proxyRequest } = require("../services/proxyService");
const { resolveGatewayTenantId } = require("../services/tenantContextService");
const { errorResponse } = require("../utils/response");

const proxyByDomain = (config) => async (req, res, next) => {
  try {
    const gatewayPath = `${req.baseUrl}${req.path}`;
    const rewrittenRoute = resolveProxyRoute(gatewayPath);

    if (!rewrittenRoute) {
      return res
        .status(404)
        .json(
          errorResponse(
            `No upstream mapping for ${req.method} ${gatewayPath}`,
            "GATEWAY_ROUTE_UNMAPPED"
          )
        );
    }

    const upstreamBaseUrl = resolveTargetBaseUrl({
      service: rewrittenRoute.service,
      config,
    });
    if (!upstreamBaseUrl) {
      return res
        .status(502)
        .json(
          errorResponse(
            `No upstream target configured for service "${rewrittenRoute.service}"`,
            "GATEWAY_TARGET_UNRESOLVED"
          )
        );
    }

    const queryString = req.originalUrl.includes("?")
      ? `?${req.originalUrl.split("?")[1]}`
      : "";
    const upstreamPath = `${rewrittenRoute.path}${queryString}`;

    if (rewrittenRoute.service === "assistant") {
      req.headers["x-tenant-id"] = resolveGatewayTenantId(req, config, { upstreamPath });
    }

    await proxyRequest({
      req,
      res,
      config,
      upstreamPath,
      upstreamBaseUrl,
    });
  } catch (error) {
    error.statusCode = error.statusCode || 502;
    error.code = error.code || "UPSTREAM_UNAVAILABLE";
    next(error);
  }
};

module.exports = {
  proxyByDomain,
};
