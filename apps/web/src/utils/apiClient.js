import axios from "axios";
import { API_BASE_URL } from "../config/apiConfig";

const TENANT_ID_REGEX = /^[a-z0-9_-]{1,64}$/;
const DEFAULT_TENANT_ID = (import.meta.env.VITE_TENANT_ID || "public").toLowerCase();

const resolveTenantId = () => {
  const fromStorage = localStorage.getItem("tenantId") || localStorage.getItem("bookieTenantId") || "";
  const normalized = String(fromStorage || DEFAULT_TENANT_ID).trim().toLowerCase();
  if (!TENANT_ID_REGEX.test(normalized)) {
    return "public";
  }
  return normalized;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const token = localStorage.getItem("token");

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!config.headers["x-tenant-id"]) {
    config.headers["x-tenant-id"] = resolveTenantId();
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export default apiClient;
