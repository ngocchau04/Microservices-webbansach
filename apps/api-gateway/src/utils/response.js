const successResponse = (data) => ({
  success: true,
  data,
});

const errorResponse = (message, code) => ({
  success: false,
  message,
  code,
});

module.exports = {
  successResponse,
  errorResponse,
};
