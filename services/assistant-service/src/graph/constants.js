const GRAPH_ENTITY_TYPES = {
  BOOK: "Book",
  AUTHOR: "Author",
  CATEGORY: "Category",
  TAG: "Tag",
  PUBLISHER: "Publisher",
  REVIEW: "Review",
  USER: "User",
};

const GRAPH_RELATION_TYPES = {
  WRITTEN_BY: "written_by",
  BELONGS_TO: "belongs_to",
  HAS_TAG: "has_tag",
  SIMILAR_TO: "similar_to",
  CHEAPER_THAN: "cheaper_than",
  HAS_REVIEW: "has_review",
  PURCHASED: "purchased",
  REVIEWED: "reviewed",
};

module.exports = {
  GRAPH_ENTITY_TYPES,
  GRAPH_RELATION_TYPES,
};

