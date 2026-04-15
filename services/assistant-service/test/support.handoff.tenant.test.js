const { createOrOpenSupportHandoff } = require("../src/services/supportHandoffService");

describe("supportHandoffService tenant propagation", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("sends tenantId in handoff payload and header", async () => {
    const fetchMock = jest.fn(async (_url, options) => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          conversation: { _id: "conv_1", tenantId: "tenant_a" },
          handoff: { mode: "human", state: "waiting_human", conversationId: "conv_1" },
        },
      }),
    }));
    global.fetch = fetchMock;

    const result = await createOrOpenSupportHandoff({
      config: {
        supportServiceUrl: "http://support-service:4007",
        supportInternalApiKey: "internal_key",
      },
      context: {
        userId: "u_1",
        userEmail: "u1@example.com",
      },
      message: "toi can nhan vien",
      analysis: { concepts: ["support_contact"] },
      intentInfo: { intent: "human_support", confidenceLabel: "high" },
      tenantId: "tenant_a",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, callOptions] = fetchMock.mock.calls[0];
    const body = JSON.parse(callOptions.body);
    expect(callOptions.headers["x-tenant-id"]).toBe("tenant_a");
    expect(body.tenantId).toBe("tenant_a");
  });
});
