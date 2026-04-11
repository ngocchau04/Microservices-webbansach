const successResponse = (data, extras = {}) => ({
  ...extras,
  success: true,
  data,
});

const errorResponse = (message, code, extras = {}) => ({
  ...extras,
  success: false,
  message,
  code,
});

module.exports = {
  successResponse,
  errorResponse,
};
