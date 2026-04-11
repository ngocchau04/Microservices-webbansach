const asNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const roundMoney = (value) => {
  return Math.round((asNumber(value, 0) + Number.EPSILON) * 100) / 100;
};

module.exports = {
  asNumber,
  roundMoney,
};

