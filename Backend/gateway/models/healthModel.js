const buildHealthPayload = ({ serviceName, target }) => {
  const payload = {
    service: serviceName,
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  if (target) {
    payload.target = target;
  }

  return payload;
};

module.exports = {
  buildHealthPayload,
};
