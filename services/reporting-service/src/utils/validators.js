const VALID_PERIODS = new Set(["day", "month", "year"]);

const parsePeriod = (value) => {
  const period = String(value || "month").toLowerCase();
  if (VALID_PERIODS.has(period)) {
    return period;
  }

  return "month";
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
};

module.exports = {
  parsePeriod,
  parsePositiveInteger,
};
