const { getEnvConfig } = require("../config/env");

/**
 * Client to communicate with catalog-service for real-time product data and reviews.
 */
class CatalogClient {
  constructor() {
    const config = getEnvConfig();
    this.baseUrl = config.catalogServiceUrl || "http://localhost:4002";
    this.apiKey = config.catalogInternalApiKey || "";
  }

  async getReviews(productId, tenantId = "public") {
    try {
      const url = `${this.baseUrl}/products/${productId}/reviews`;
      const response = await fetch(url, {
        headers: {
          "x-tenant-id": tenantId,
          "x-internal-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        console.error(`[CatalogClient] Failed to fetch reviews for ${productId}: ${response.status}`);
        return [];
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error(`[CatalogClient] Error fetching reviews:`, error.message);
      return [];
    }
  }

  async getProductDetails(productId, tenantId = "public") {
    try {
      const url = `${this.baseUrl}/products/${productId}`;
      const response = await fetch(url, {
        headers: {
          "x-tenant-id": tenantId,
          "x-internal-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        console.error(`[CatalogClient] Failed to fetch product ${productId}: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error(`[CatalogClient] Error fetching product details:`, error.message);
      return null;
    }
  }
}

module.exports = new CatalogClient();
