require("dotenv").config();

const { createGatewayApp } = require("./app");

const startGatewayServer = (overrides = {}) => {
  const { app, config } = createGatewayApp(overrides);

  return new Promise((resolve, reject) => {
    const server = app.listen(config.gatewayPort, () => {
      console.log(`API Gateway is running on port ${config.gatewayPort}`);
      console.log(`Proxy target: ${config.legacyServiceUrl}`);
      resolve(server);
    });

    server.on("error", reject);
  });
};

if (require.main === module) {
  startGatewayServer().catch((error) => {
    console.error("Failed to start API Gateway:", error.message);
    process.exit(1);
  });
}

module.exports = {
  createGatewayApp,
  startGatewayServer,
};
