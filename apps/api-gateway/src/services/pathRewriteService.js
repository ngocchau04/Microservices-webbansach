const buildRewriteRules = () => [
  { pattern: /^\/api\/auth\/register\/?$/, target: () => ({ service: "identity", path: "/register" }) },
  { pattern: /^\/api\/auth\/login\/?$/, target: () => ({ service: "identity", path: "/login" }) },
  {
    pattern: /^\/api\/auth\/refresh-token\/?$/,
    target: () => ({ service: "identity", path: "/refresh-token" }),
  },
  {
    pattern: /^\/api\/auth\/verify-account\/?$/,
    target: () => ({ service: "identity", path: "/verify-account" }),
  },
  {
    pattern: /^\/api\/auth\/verify\/?$/,
    target: () => ({ service: "identity", path: "/verify" }),
  },
  {
    pattern: /^\/api\/auth\/google-login\/?$/,
    target: () => ({ service: "identity", path: "/google-login" }),
  },
  { pattern: /^\/api\/auth\/me\/?$/, target: () => ({ service: "identity", path: "/me" }) },
  {
    pattern: /^\/api\/auth\/check-email\/?$/,
    target: () => ({ service: "identity", path: "/check-email" }),
  },
  {
    pattern: /^\/api\/auth\/resend-verification\/?$/,
    target: () => ({ service: "identity", path: "/resend-verification" }),
  },
  {
    pattern: /^\/api\/auth\/resend\/?$/,
    target: () => ({ service: "identity", path: "/resend" }),
  },
  {
    pattern: /^\/api\/auth\/forgot-password\/?$/,
    target: () => ({ service: "identity", path: "/forgot-password" }),
  },
  {
    pattern: /^\/api\/auth\/profile\/(name|phone|password)\/?$/,
    target: (match) => ({ service: "identity", path: `/profile/${match[1]}` }),
  },
  {
    pattern: /^\/api\/auth\/users\/count\/?$/,
    target: () => ({ service: "identity", path: "/users/count" }),
  },
  {
    pattern: /^\/api\/auth\/users\/([^/]+)\/status\/?$/,
    target: (match) => ({ service: "identity", path: `/users/${match[1]}/status` }),
  },
  {
    pattern: /^\/api\/auth\/users\/([^/]+)\/orders\/?$/,
    target: (match) => ({ service: "checkout", path: `/users/${match[1]}/orders` }),
  },
  {
    pattern: /^\/api\/auth\/users\/([^/]+)\/?$/,
    target: (match) => ({ service: "identity", path: `/users/${match[1]}` }),
  },
  {
    pattern: /^\/api\/auth\/users\/?$/,
    target: () => ({ service: "identity", path: "/users" }),
  },
  {
    pattern: /^\/api\/auth\/favorites\/?$/,
    target: () => ({ service: "identity", path: "/favorites" }),
  },

  { pattern: /^\/api\/catalog\/health\/?$/, target: () => ({ service: "catalog", path: "/health" }) },
  {
    pattern: /^\/api\/catalog\/products\/list\/?$/,
    target: () => ({ service: "catalog", path: "/products/list" }),
  },
  {
    pattern: /^\/api\/catalog\/products\/similar\/([^/]+)\/?$/,
    target: (match) => ({ service: "catalog", path: `/products/similar/${match[1]}` }),
  },
  {
    pattern: /^\/api\/catalog\/products\/([^/]+)\/reviews\/?$/,
    target: (match) => ({ service: "catalog", path: `/products/${match[1]}/reviews` }),
  },
  {
    pattern: /^\/api\/catalog\/products\/([^/]+)\/?$/,
    target: (match) => ({ service: "catalog", path: `/products/${match[1]}` }),
  },
  {
    pattern: /^\/api\/catalog\/products\/?$/,
    target: () => ({ service: "catalog", path: "/products" }),
  },
  {
    pattern: /^\/api\/catalog\/reviews\/([^/]+)\/?$/,
    target: (match) => ({ service: "catalog", path: `/reviews/${match[1]}` }),
  },
  {
    pattern: /^\/api\/catalog\/search(\/.*)?$/,
    target: (match) => ({ service: "catalog", path: `/search${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/catalog\/feedback(\/.*)?$/,
    target: (match) => ({ service: "catalog", path: `/feedback${match[1] || ""}` }),
  },

  { pattern: /^\/api\/checkout\/cart\/list\/?$/, target: () => ({ service: "checkout", path: "/cart/list" }) },
  {
    pattern: /^\/api\/checkout\/cart(\/.*)?$/,
    target: (match) => ({ service: "checkout", path: `/cart${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/checkout\/vouchers(\/.*)?$/,
    target: (match) => ({ service: "checkout", path: `/vouchers${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/checkout\/orders(\/.*)?$/,
    target: (match) => ({ service: "checkout", path: `/orders${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/checkout\/users\/([^/]+)\/orders\/?$/,
    target: (match) => ({ service: "checkout", path: `/users/${match[1]}/orders` }),
  },
  {
    pattern: /^\/api\/checkout\/health\/?$/,
    target: () => ({ service: "checkout", path: "/health" }),
  },
  {
    pattern: /^\/api\/checkout\/admin\/orders(\/.*)?$/,
    target: (match) => ({ service: "checkout", path: `/admin/orders${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/checkout\/payments(\/.*)?$/,
    target: (match) => ({ service: "checkout", path: `/payments${match[1] || ""}` }),
  },

  {
    pattern: /^\/api\/media\/images\/?$/,
    target: () => ({ service: "media", path: "/images" }),
  },
  {
    pattern: /^\/api\/media\/images\/([^/]+)\/?$/,
    target: (match) => ({ service: "media", path: `/images/${match[1]}` }),
  },
  {
    pattern: /^\/api\/media\/health\/?$/,
    target: () => ({ service: "media", path: "/health" }),
  },
  {
    pattern: /^\/api\/media\/(.+)$/,
    target: (match) => ({ service: "media", path: `/${match[1]}` }),
  },

  {
    pattern: /^\/api\/notify\/health\/?$/,
    target: () => ({ service: "notification", path: "/health" }),
  },
  {
    pattern: /^\/api\/notify(\/.*)?$/,
    target: (match) => ({
      service: "notification",
      path: match[1] || "/",
    }),
  },
  {
    pattern: /^\/api\/reporting\/health\/?$/,
    target: () => ({ service: "reporting", path: "/health" }),
  },
  {
    pattern: /^\/api\/reporting\/dashboard\/summary\/?$/,
    target: () => ({ service: "reporting", path: "/dashboard/summary" }),
  },
  {
    pattern: /^\/api\/reporting\/dashboard\/revenue\/?$/,
    target: () => ({ service: "reporting", path: "/dashboard/revenue" }),
  },
  {
    pattern: /^\/api\/reporting\/dashboard\/top-products\/?$/,
    target: () => ({ service: "reporting", path: "/dashboard/top-products" }),
  },
  {
    pattern: /^\/api\/reporting\/dashboard\/order-status\/?$/,
    target: () => ({ service: "reporting", path: "/dashboard/order-status" }),
  },
  // Legacy alias kept for current admin revenue screen compatibility
  {
    pattern: /^\/api\/reporting\/revenue\/?$/,
    target: () => ({ service: "reporting", path: "/dashboard/revenue" }),
  },

  {
    pattern: /^\/api\/support\/feedback(\/.*)?$/,
    target: (match) => ({ service: "support", path: `/feedback${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/support\/admin\/feedback(\/.*)?$/,
    target: (match) => ({ service: "support", path: `/admin/feedback${match[1] || ""}` }),
  },
  {
    pattern: /^\/api\/support\/health\/?$/,
    target: () => ({ service: "support", path: "/health" }),
  },
];

const resolveProxyRoute = (gatewayPath) => {
  const rules = buildRewriteRules();

  for (const rule of rules) {
    const match = gatewayPath.match(rule.pattern);
    if (match) {
      return rule.target(match);
    }
  }

  return null;
};

const resolveTargetBaseUrl = ({ service, config }) => {
  if (service === "identity") {
    return config.identityServiceUrl;
  }

  if (service === "catalog") {
    return config.catalogServiceUrl;
  }

  if (service === "checkout") {
    return config.checkoutServiceUrl;
  }

  if (service === "media") {
    return config.mediaServiceUrl;
  }

  if (service === "notification") {
    return config.notificationServiceUrl;
  }

  if (service === "reporting") {
    return config.reportingServiceUrl;
  }

  if (service === "support") {
    return config.supportServiceUrl;
  }

  return null;
};

module.exports = {
  resolveProxyRoute,
  resolveTargetBaseUrl,
};
