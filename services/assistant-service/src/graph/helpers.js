const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (value = "") => normalizeText(value).replace(/\s+/g, "-").slice(0, 120);

const makeBookEntityId = (productId) => `book:${String(productId || "").trim()}`;
const makeAuthorEntityId = (author) => `author:${slugify(author)}`;
const makeCategoryEntityId = (category) => `category:${slugify(category)}`;
const makeTagEntityId = (tag) => `tag:${slugify(tag)}`;
const makePublisherEntityId = (publisher) => `publisher:${slugify(publisher)}`;
const makeReviewEntityId = (reviewId) => `review:${String(reviewId || "").trim()}`;
const makeUserEntityId = (userId) => `user:${String(userId || "").trim()}`;

module.exports = {
  normalizeText,
  slugify,
  makeBookEntityId,
  makeAuthorEntityId,
  makeCategoryEntityId,
  makeTagEntityId,
  makePublisherEntityId,
  makeReviewEntityId,
  makeUserEntityId,
};

