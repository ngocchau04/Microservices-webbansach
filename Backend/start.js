require("dotenv").config();

const { startServer } = require("./index");
const { startGatewayServer } = require("./gateway");

const startAllServices = async () => {
  const gatewayPort = Number(process.env.GATEWAY_PORT || process.env.PORT || 3001);
  const legacyPort = Number(process.env.LEGACY_SERVICE_PORT || 3002);

  if (gatewayPort === legacyPort) {
    throw new Error(
      "GATEWAY_PORT and LEGACY_SERVICE_PORT must be different to avoid port conflicts."
    );
  }

  process.env.GATEWAY_PORT = String(gatewayPort);
  process.env.LEGACY_SERVICE_PORT = String(legacyPort);

  const legacyServiceUrl =
    process.env.LEGACY_SERVICE_URL || `http://127.0.0.1:${legacyPort}`;

  await startServer({ port: legacyPort });
  await startGatewayServer({
    gatewayPort,
    legacyServiceUrl,
  });
};

if (require.main === module) {
  startAllServices().catch((error) => {
    console.error("Failed to start migration runtime:", error.message);
    process.exit(1);
  });
}

module.exports = {
  startAllServices,
};
