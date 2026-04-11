import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import { UserProvider } from "./context/UserContext.jsx";
import App from "./App.jsx";
import { API_BASE_URL } from "./config/apiConfig.js";

axios.defaults.baseURL = API_BASE_URL;
axios.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    return nativeFetch(`${API_BASE_URL}${input}`, init);
  }
  return nativeFetch(input, init);
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserProvider>
        <App />
    </UserProvider>
  </StrictMode>
);
