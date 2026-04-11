const authService = require("../services/authService");
const { sendServiceResult } = require("../utils/http");

const listUsers = async (req, res) => {
  const result = await authService.listUsers();
  return sendServiceResult(res, result);
};

const countUsers = async (req, res) => {
  const result = await authService.countUsers();

  if (req.query.legacy === "1") {
    return res.status(200).send(String(result.data.total));
  }

  if (req.get("x-legacy-response") === "1") {
    return res.status(200).send(String(result.data.total));
  }

  return sendServiceResult(res, result);
};

const getUserById = async (req, res) => {
  const result = await authService.getUserById({ userId: req.params.id });
  return sendServiceResult(res, result);
};

const updateUserStatus = async (req, res) => {
  const result = await authService.updateUserStatus({
    userId: req.params.id,
    status: req.body.status,
    isActive: req.body.isActive,
  });
  return sendServiceResult(res, result);
};

module.exports = {
  listUsers,
  countUsers,
  getUserById,
  updateUserStatus,
};
