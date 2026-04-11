const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const { legacyRoutes } = require("./legacy/routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "legacy-monolith",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/", legacyRoutes);

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in Backend/.env");
  }

  const isAtlasUri = mongoUri.startsWith("mongodb+srv://");
  const hasAuthSource = mongoUri.includes("authSource=");
  const canRetryWithAdminAuthSource = isAtlasUri && !hasAuthSource;

  const buildAdminAuthSourceUri = (uri) =>
    uri.includes("?") ? `${uri}&authSource=admin` : `${uri}?authSource=admin`;

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    const isAtlasAuthError = error?.code === 8000;

    if (isAtlasAuthError && canRetryWithAdminAuthSource) {
      try {
        await mongoose.connect(buildAdminAuthSourceUri(mongoUri));
        console.log("MongoDB connected (retry with authSource=admin)");
        return;
      } catch (retryError) {
        console.error(
          "MongoDB authentication failed after retry. Check Atlas DB user/password and IP access list."
        );
        throw retryError;
      }
    }

    if (isAtlasAuthError) {
      console.error(
        "MongoDB authentication failed. Check MONGO_URI credentials and Atlas DB user permissions."
      );
    } else {
      console.error("MongoDB connection error:", error.message);
    }

    throw error;
  }
};

const startServer = async (overrides = {}) => {
  try {
    await connectDB();
    const port =
      overrides.port || process.env.LEGACY_SERVICE_PORT || process.env.PORT || 3001;

    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        console.log(`Legacy service is running on port ${port}`);
        resolve(server);
      });

      server.on("error", reject);
    });
  } catch (error) {
    console.error("Legacy service failed to start:", error.message);
    process.exit(1);
  }
};

if (require.main === module && process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = { app, connectDB, startServer };
