const ReportCache = require("../models/ReportCache");
const { parsePeriod, parsePositiveInteger } = require("../utils/validators");
const { fetchAllOrders, fetchUsersCount } = require("./internalServiceClient");

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const isOrderIncludedForRevenue = (order) => {
  const status = String(order?.orderStatus || "").toLowerCase();
  if (status.includes("huy")) return false;
  if (status.includes("cancel")) return false;
  if (status.includes("return")) return false;
  if (status.includes("don hoan")) return false;
  if (status.includes("đon hoan")) return false;
  if (status.includes("đơn hoàn")) return false;
  if (status.includes("refund")) return false;
  return true;
};

const getOrderTotal = (order) => {
  const total = toNumber(order?.totals?.total);
  if (total > 0) {
    return total;
  }

  const subtotal = Array.isArray(order?.items)
    ? order.items.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0)
    : 0;
  const discount = toNumber(order?.totals?.discount);
  return Math.max(subtotal - discount, 0);
};

const getDateBucketLabel = ({ period, date }) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (period === "day") {
    return `${year}-${month}-${day}`;
  }

  if (period === "year") {
    return `${year}`;
  }

  return `${year}-${month}`;
};

const buildRevenuePoints = ({ orders, period }) => {
  const bucketMap = new Map();

  orders.forEach((order) => {
    if (!isOrderIncludedForRevenue(order)) {
      return;
    }

    const createdAt = new Date(order.createdAt || order.updatedAt || Date.now());
    if (Number.isNaN(createdAt.getTime())) {
      return;
    }

    const label = getDateBucketLabel({ period, date: createdAt });
    const current = bucketMap.get(label) || 0;
    bucketMap.set(label, current + getOrderTotal(order));
  });

  return Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({
      label,
      revenue: Math.round(value),
    }));
};

const buildLegacyYearSeries = (points) => {
  const yearly = new Map();

  points.forEach((point) => {
    const [yearString, monthString] = point.label.split("-");
    const year = Number(yearString);
    const monthIndex = Number(monthString) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return;
    }

    if (!yearly.has(year)) {
      yearly.set(year, new Array(12).fill(0));
    }

    yearly.get(year)[monthIndex] = Math.round(point.revenue || 0);
  });

  return Array.from(yearly.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, revenue]) => ({
      year,
      revenue,
    }));
};

const buildTopProducts = (orders) => {
  const map = new Map();

  orders.forEach((order) => {
    if (!isOrderIncludedForRevenue(order) || !Array.isArray(order.items)) {
      return;
    }

    order.items.forEach((item) => {
      const key = String(item.productId || item.title || "unknown");
      const quantity = toNumber(item.quantity);
      const price = toNumber(item.price);
      const revenue = quantity * price;

      if (!map.has(key)) {
        map.set(key, {
          productId: String(item.productId || ""),
          title: item.title || "Product",
          image: item.image || "",
          unitPrice: price,
          soldQuantity: 0,
          revenue: 0,
        });
      }

      const current = map.get(key);
      current.soldQuantity += quantity;
      current.revenue += revenue;
    });
  });

  return Array.from(map.values());
};

const buildOrderStatusStats = (orders) => {
  const byStatus = new Map();

  orders.forEach((order) => {
    const status = String(order?.orderStatus || "unknown");
    const current = byStatus.get(status) || { status, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += getOrderTotal(order);
    byStatus.set(status, current);
  });

  const items = Array.from(byStatus.values()).sort((a, b) => b.count - a.count);
  return items.map((item) => ({
    status: item.status,
    count: item.count,
    revenue: Math.round(item.revenue),
  }));
};

const readCache = async (key) => {
  const item = await ReportCache.findOne({ key });
  if (!item) {
    return null;
  }

  if (item.expiresAt.getTime() <= Date.now()) {
    await ReportCache.deleteOne({ _id: item._id });
    return null;
  }

  return item.payload;
};

const writeCache = async ({ key, payload, ttlSeconds }) => {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await ReportCache.findOneAndUpdate(
    { key },
    { payload, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const resolveOrders = async ({ config }) => fetchAllOrders({ config });

const getDashboardSummary = async ({ config }) => {
  const cacheKey = "dashboard_summary";
  const cached = await readCache(cacheKey);
  if (cached) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...cached,
        cached: true,
      },
    };
  }

  // Identity GET /users/count: registered customer accounts (role !== admin).
  const [orders, customerAccountCount] = await Promise.all([
    resolveOrders({ config }),
    fetchUsersCount({ config }).catch(() => 0),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = Math.round(
    orders.reduce((sum, order) => {
      if (!isOrderIncludedForRevenue(order)) {
        return sum;
      }
      return sum + getOrderTotal(order);
    }, 0)
  );
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const orderStatusStats = buildOrderStatusStats(orders);
  const topProducts = buildTopProducts(orders)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const payload = {
    totalOrders,
    totalRevenue,
    avgOrderValue,
    customerAccountCount,
    totalUsers: customerAccountCount,
    topProducts,
    orderStatus: orderStatusStats,
  };

  await writeCache({
    key: cacheKey,
    payload,
    ttlSeconds: config.dashboardCacheTtlSeconds,
  });

  return {
    ok: true,
    statusCode: 200,
    data: payload,
  };
};

const getDashboardRevenue = async ({ period: rawPeriod, config }) => {
  const period = parsePeriod(rawPeriod);
  const orders = await resolveOrders({ config });
  const points = buildRevenuePoints({ orders, period });
  const totalRevenue = points.reduce((sum, point) => sum + point.revenue, 0);

  return {
    ok: true,
    statusCode: 200,
    data: {
      period,
      points,
      totalRevenue: Math.round(totalRevenue),
      legacySeries: period === "month" ? buildLegacyYearSeries(points) : [],
    },
  };
};

const getDashboardTopProducts = async ({ config, limit: rawLimit, sortBy }) => {
  const limit = parsePositiveInteger(rawLimit, 5);
  const orders = await resolveOrders({ config });
  const products = buildTopProducts(orders);

  const sortMode = sortBy === "quantity" ? "quantity" : "revenue";
  const sorted = [...products].sort((a, b) => {
    if (sortMode === "quantity") {
      return b.soldQuantity - a.soldQuantity;
    }
    return b.revenue - a.revenue;
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      sortBy: sortMode,
      limit,
      items: sorted.slice(0, limit),
    },
  };
};

const getDashboardOrderStatus = async ({ config }) => {
  const orders = await resolveOrders({ config });
  const items = buildOrderStatusStats(orders);
  const totalOrders = items.reduce((sum, item) => sum + item.count, 0);

  return {
    ok: true,
    statusCode: 200,
    data: {
      totalOrders,
      items,
    },
  };
};

module.exports = {
  getDashboardSummary,
  getDashboardRevenue,
  getDashboardTopProducts,
  getDashboardOrderStatus,
};
