const hasMinLength = (value, minLength) =>
  String(value || "").trim().length >= minLength;

const VALID_STATUS = new Set(["open", "in_progress", "resolved", "closed"]);
const VALID_HANDOFF_STATE = new Set(["bot_only", "waiting_human", "human_active", "closed"]);

const validateCreateFeedbackInput = (payload = {}) => {
  if (!hasMinLength(payload.subject, 3)) {
    return "subject must be at least 3 characters";
  }

  if (!hasMinLength(payload.message, 5)) {
    return "message must be at least 5 characters";
  }

  return null;
};

const validateStatus = (status) => VALID_STATUS.has(String(status || "").trim());
const validateHandoffState = (state) => VALID_HANDOFF_STATE.has(String(state || "").trim());

module.exports = {
  validateCreateFeedbackInput,
  validateStatus,
  validateHandoffState,
};
