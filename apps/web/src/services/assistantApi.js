import apiClient from "../utils/apiClient";

export async function fetchAssistantSuggestions(query = "") {
  const { data } = await apiClient.get("/api/assistant/suggestions", {
    params: query ? { q: query } : {},
  });
  return data?.data ?? {};
}

export async function sendAssistantChat(message, context) {
  const payload = { message };
  if (context && typeof context === "object" && Object.keys(context).length) {
    payload.context = context;
  }
  const { data } = await apiClient.post("/api/assistant/chat", payload);
  return data?.data ?? {};
}
