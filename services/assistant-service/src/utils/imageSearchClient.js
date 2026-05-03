const { getEnvConfig } = require("../config/env");

class ImageSearchClient {
  constructor() {
    const config = getEnvConfig();
    this.baseUrl = config.imageSearchServiceUrl || "http://localhost:4010";
    this.apiKey = config.imageSearchInternalApiKey || "";
  }

  buildHeaders(extra = {}) {
    return {
      ...(this.apiKey ? { "x-internal-api-key": this.apiKey } : {}),
      ...extra,
    };
  }

  async searchByImageBuffer(imageBuffer, topK = 5) {
    try {
      const form = new FormData();
      const blob = new Blob([imageBuffer], { type: "image/jpeg" });
      form.append("image", blob, "upload.jpg");
      form.append("topK", String(topK));
      const res = await fetch(`${this.baseUrl}/search/image`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: form,
      });
      if (!res.ok) {
        return { ok: false, statusCode: res.status, message: `image-search HTTP ${res.status}` };
      }
      const json = await res.json();
      return { ok: true, data: json };
    } catch (error) {
      return { ok: false, statusCode: 502, message: error.message || "image-search unavailable" };
    }
  }
}

module.exports = new ImageSearchClient();

