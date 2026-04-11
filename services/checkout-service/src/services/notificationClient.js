const postWithTimeout = async ({ url, payload, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body?.message || `Notification request failed: ${response.status}`;
      throw new Error(message);
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
};

const sendOrderEmail = async ({ config, order }) => {
  const url = `${config.notificationServiceUrl}/send-order-email`;

  return postWithTimeout({
    url,
    timeoutMs: config.notificationRequestTimeoutMs,
    payload: {
      email: order.shippingInfo.email,
      customerName: order.shippingInfo.name,
      orderId: String(order._id),
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
      total: order.totals.total,
      paymentMethod: order.paymentMethod,
      idempotencyKey: `checkout-order-created-${order._id}`,
    },
  });
};

const sendOrderStatusEmail = async ({ config, order, previousStatus }) => {
  const url = `${config.notificationServiceUrl}/send-order-status-email`;

  return postWithTimeout({
    url,
    timeoutMs: config.notificationRequestTimeoutMs,
    payload: {
      email: order.shippingInfo.email,
      customerName: order.shippingInfo.name,
      orderId: String(order._id),
      previousStatus: previousStatus || "",
      status: order.orderStatus,
      idempotencyKey: `checkout-order-status-${order._id}-${order.orderStatus}`,
    },
  });
};

module.exports = {
  sendOrderEmail,
  sendOrderStatusEmail,
};
