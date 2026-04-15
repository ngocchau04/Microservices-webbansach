const createIssueSummary = (analysis = {}, intentInfo = {}) => {
  const concepts = Array.isArray(analysis.concepts) ? analysis.concepts : [];
  const tags = [];
  if (concepts.includes("shipping_policy")) tags.push("van chuyen");
  if (concepts.includes("return_policy")) tags.push("doi tra");
  if (concepts.includes("support_contact")) tags.push("nhan vien ho tro");
  if (concepts.includes("frontend")) tags.push("frontend");
  if (concepts.includes("backend")) tags.push("backend");
  if (!tags.length) {
    tags.push("ho tro chung");
  }
  const confidence = intentInfo.confidenceLabel || "medium";
  return `Yeu cau chuyen nhan vien (${tags.join(", ")}) · intent=${intentInfo.intent || "human_support"} · confidence=${confidence}`;
};

const createOrOpenSupportHandoff = async ({
  config,
  context = {},
  message = "",
  analysis = {},
  intentInfo = {},
  tenantId = "public",
}) => {
  if (!config.supportServiceUrl || !config.supportInternalApiKey) {
    return {
      ok: false,
      statusCode: 503,
      message: "Support handoff is not configured",
      code: "ASSISTANT_HANDOFF_NOT_CONFIGURED",
    };
  }

  const payload = {
    tenantId: String(tenantId || "").trim(),
    userId: String(context.userId || "").trim(),
    userEmail: String(context.userEmail || "").trim(),
    sessionId: String(context.sessionId || "").trim(),
    latestUserMessage: String(message || "").trim(),
    issueSummary: createIssueSummary(analysis, intentInfo),
    detectedIntent: intentInfo.intent || "human_support",
    recentMessages: Array.isArray(context.recentMessages) ? context.recentMessages.slice(-8) : [],
  };

  try {
    const res = await fetch(`${config.supportServiceUrl}/internal/handoffs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-api-key": config.supportInternalApiKey,
        "x-tenant-id": String(tenantId || "").trim(),
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        statusCode: res.status || 500,
        message: json?.message || "Support handoff failed",
        code: json?.errorCode || "ASSISTANT_HANDOFF_FAILED",
      };
    }

    return {
      ok: true,
      statusCode: 200,
      data: {
        conversation: json.data?.conversation || json.data?.item || null,
        handoff: json.data?.handoff || null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 502,
      message: error.message || "Cannot reach support-service",
      code: "ASSISTANT_HANDOFF_UNREACHABLE",
    };
  }
};

module.exports = {
  createOrOpenSupportHandoff,
};
