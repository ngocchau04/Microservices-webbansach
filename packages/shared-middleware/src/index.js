const requestId = (req, res, next) => {
  req.requestId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  next();
};

module.exports = {
  requestId,
};
