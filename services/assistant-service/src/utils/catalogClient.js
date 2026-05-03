const { getEnvConfig } = require("../config/env");

const toQueryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

/**
 * Client to communicate with catalog-service for real-time product data and reviews.
 */
class CatalogClient {
  constructor() {
    const config = getEnvConfig();
    this.baseUrl = config.catalogServiceUrl || "http://localhost:4002";
    this.apiKey = config.catalogInternalApiKey || "";
  }

  buildHeaders(tenantId = "public") {
    return {
      "x-tenant-id": tenantId,
      "x-internal-api-key": this.apiKey,
    };
  }

  async getReviews(productId, tenantId = "public") {
    try {
      const url = `${this.baseUrl}/products/${productId}/reviews`;
      const response = await fetch(url, {
        headers: this.buildHeaders(tenantId),
      });

      if (!response.ok) {
        console.error(`[CatalogClient] Failed to fetch reviews for ${productId}: ${response.status}`);
        return [];
      }

      const result = await response.json();
      return result?.data?.items || result?.data?.reviews || result?.data || [];
    } catch (error) {
      console.error(`[CatalogClient] Error fetching reviews:`, error.message);
      return [];
    }
  }

  async getProductDetails(productId, tenantId = "public") {
    try {
      const url = `${this.baseUrl}/products/${productId}`;
      const response = await fetch(url, {
        headers: this.buildHeaders(tenantId),
      });

      if (!response.ok) {
        console.error(`[CatalogClient] Failed to fetch product ${productId}: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result?.data?.item || result?.data?.product || result?.data || null;
    } catch (error) {
      console.error(`[CatalogClient] Error fetching product details:`, error.message);
      return null;
    }
  }

  async searchProducts(params = {}, tenantId = "public") {
    try {
      const query = toQueryString(params);
      const url = `${this.baseUrl}/products${query}`;
      const response = await fetch(url, {
        headers: this.buildHeaders(tenantId),
      });

      if (!response.ok) {
        console.error(`[CatalogClient] Failed to search products: ${response.status}`);
        return [];
      }

      const result = await response.json();
      return result?.data?.items || result?.data?.products || result?.data || [];
    } catch (error) {
      console.error(`[CatalogClient] Error searching products:`, error.message);
      return [];
    }
  }

  async listTopProducts(tenantId = "public", limit = 5) {
    try {
      const url = `${this.baseUrl}/search?mode=top10`;
      const response = await fetch(url, {
        headers: this.buildHeaders(tenantId),
      });

      if (!response.ok) {
        console.error(`[CatalogClient] Failed to list top products: ${response.status}`);
        return [];
      }

      const result = await response.json();
      const items = result?.data?.items || result?.data || [];
      return Array.isArray(items) ? items.slice(0, limit) : [];
    } catch (error) {
      console.error(`[CatalogClient] Error listing top products:`, error.message);
      return [];
    }
  }
}

module.exports = new CatalogClient();
