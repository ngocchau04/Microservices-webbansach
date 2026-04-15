import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAdminCopilotContextPayload,
  parseAdminCopilotSections,
} from "./copilotUtils.js";

test("buildAdminCopilotContextPayload carries compact conversation and ops fields", () => {
  const payload = buildAdminCopilotContextPayload({
    conversationText: "user: đơn chưa đến",
    ticketId: "T1",
    copilotSessionId: "sess-a",
    conversationStatus: "open",
    supportTags: ["Giao hàng"],
    escalationTitle: "Đề xuất escalate cấp chuyên trách",
    escalationLevel: "medium",
    inventorySummary: { outOfStock: 1, lowStock: 2, alerts: [] },
  });
  assert.equal(payload.mode, "admin_copilot");
  assert.equal(payload.ticketId, "T1");
  assert.equal(payload.copilotSessionId, "sess-a");
  assert.match(payload.conversationCompact, /đơn chưa đến/);
  assert.equal(payload.escalationLevel, "medium");
});

test("parseAdminCopilotSections parses all four sections", () => {
  const sections = parseAdminCopilotSections(`
Tóm tắt:
- Khach chua nhan duoc don
Hướng xử lý:
- Kiem tra van don
Câu trả lời gợi ý:
- Team da tiep nhan
Cảnh báo liên quan:
- Co 1 sach sap het
`);
  assert.equal(sections["Tóm tắt"], "- Khach chua nhan duoc don");
  assert.equal(sections["Hướng xử lý"], "- Kiem tra van don");
  assert.equal(sections["Câu trả lời gợi ý"], "- Team da tiep nhan");
  assert.equal(sections["Cảnh báo liên quan"], "- Co 1 sach sap het");
});

test("parseAdminCopilotSections falls back when response is unstructured", () => {
  const sections = parseAdminCopilotSections("Tra loi chung chung");
  assert.equal(sections["Tóm tắt"], "Tra loi chung chung");
  assert.ok(sections["Hướng xử lý"].length > 0);
});
