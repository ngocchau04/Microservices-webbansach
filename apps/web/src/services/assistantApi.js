import apiClient from "../utils/apiClient";

export async function fetchAssistantSuggestions(query = "") {
  const { data } = await apiClient.get("/api/assistant/suggestions", {
    params: query ? { q: query } : {},
  });
  return data?.data ?? {};
}

export async function sendAssistantChat(message, context, options = {}) {
  const payload = { message };
  if (options.currentProductId) {
    payload.currentProductId = options.currentProductId;
  }
  if (context && typeof context === "object" && Object.keys(context).length) {
    payload.context = context;
  }
  const { data } = await apiClient.post("/api/assistant/chat", payload);
  return data?.data ?? {};
}

export async function sendAssistantImageChat({ message = "", imageFile, currentProductId }) {
  const form = new FormData();
  if (message) {
    form.append("message", message);
  }
  if (currentProductId) {
    form.append("currentProductId", currentProductId);
  }
  form.append("image", imageFile);
  const { data } = await apiClient.post("/api/assistant/chat/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.data ?? {};
}
