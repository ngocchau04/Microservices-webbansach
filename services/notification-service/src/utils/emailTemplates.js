const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN").format(amount);
};

const formatItemsText = (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    return "No item details";
  }

  return items
    .map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      return `${index + 1}. ${item.title || "Product"} x${qty} - ${formatCurrency(price)} VND`;
    })
    .join("\n");
};

const buildVerificationTemplate = (payload, config) => {
  const recipientName = payload.name ? String(payload.name).trim() : "Customer";
  const verificationCode = String(payload.verificationCode).trim();
  const subject = "[Bookstore] Your verification code";
  const text = [
    `Hello ${recipientName},`,
    "",
    "Thank you for creating your bookstore account.",
    `Your verification code is: ${verificationCode}`,
    "",
    "If you did not request this, please ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hello ${recipientName},</p>
      <p>Thank you for creating your bookstore account.</p>
      <p>Your verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${verificationCode}</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr />
      <small>Sent by ${config.emailFrom}</small>
    </div>
  `;

  return {
    to: payload.email,
    subject,
    text,
    html,
  };
};

const buildOrderConfirmationTemplate = (payload, config) => {
  const recipientName = payload.customerName ? String(payload.customerName).trim() : "Customer";
  const subject = `[Bookstore] Order confirmation #${payload.orderId}`;
  const itemsText = formatItemsText(payload.items || []);
  const paymentMethod = payload.paymentMethod || "cod";

  const text = [
    `Hello ${recipientName},`,
    "",
    `Your order #${payload.orderId} has been placed successfully.`,
    `Payment method: ${paymentMethod}`,
    "",
    "Items:",
    itemsText,
    "",
    `Total: ${formatCurrency(payload.total)} VND`,
    "",
    "Thank you for shopping with us.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hello ${recipientName},</p>
      <p>Your order <strong>#${payload.orderId}</strong> has been placed successfully.</p>
      <p>Payment method: <strong>${paymentMethod}</strong></p>
      <p>Total: <strong>${formatCurrency(payload.total)} VND</strong></p>
      <p>Thank you for shopping with us.</p>
      <hr />
      <small>Sent by ${config.emailFrom}</small>
    </div>
  `;

  return {
    to: payload.email,
    subject,
    text,
    html,
  };
};

const buildOrderStatusTemplate = (payload, config) => {
  const recipientName = payload.customerName ? String(payload.customerName).trim() : "Customer";
  const subject = `[Bookstore] Order #${payload.orderId} status updated`;
  const previousStatus = payload.previousStatus
    ? `Previous status: ${payload.previousStatus}\n`
    : "";
  const text = [
    `Hello ${recipientName},`,
    "",
    `Your order #${payload.orderId} status has been updated.`,
    previousStatus + `Current status: ${payload.status}`,
    "",
    "If you need support, please contact us.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hello ${recipientName},</p>
      <p>Your order <strong>#${payload.orderId}</strong> status has been updated.</p>
      ${
        payload.previousStatus
          ? `<p>Previous status: <strong>${payload.previousStatus}</strong></p>`
          : ""
      }
      <p>Current status: <strong>${payload.status}</strong></p>
      <p>If you need support, please contact us.</p>
      <hr />
      <small>Sent by ${config.emailFrom}</small>
    </div>
  `;

  return {
    to: payload.email,
    subject,
    text,
    html,
  };
};

const buildSupportAcknowledgementTemplate = (payload, config) => {
  const recipientName = payload.customerName ? String(payload.customerName).trim() : "Customer";
  const subject = payload.subject
    ? `[Bookstore Support] ${payload.subject}`
    : `[Bookstore Support] We received ticket ${payload.ticketId || ""}`.trim();
  const bodyMessage = payload.message
    ? String(payload.message).trim()
    : "Our support team will contact you soon.";

  const text = [
    `Hello ${recipientName},`,
    "",
    "We have received your support request.",
    payload.ticketId ? `Ticket ID: ${payload.ticketId}` : null,
    "",
    bodyMessage,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hello ${recipientName},</p>
      <p>We have received your support request.</p>
      ${payload.ticketId ? `<p>Ticket ID: <strong>${payload.ticketId}</strong></p>` : ""}
      <p>${bodyMessage}</p>
      <hr />
      <small>Sent by ${config.emailFrom}</small>
    </div>
  `;

  return {
    to: payload.email,
    subject,
    text,
    html,
  };
};

module.exports = {
  buildVerificationTemplate,
  buildOrderConfirmationTemplate,
  buildOrderStatusTemplate,
  buildSupportAcknowledgementTemplate,
};
