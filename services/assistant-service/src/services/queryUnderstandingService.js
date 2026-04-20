const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const STOPWORDS = new Set([
  "la",
  "toi",
  "minh",
  "ban",
  "cho",
  "nha",
  "nhe",
  "voi",
  "giup",
  "duoc",
  "khong",
  "co",
  "nao",
  "cai",
  "nay",
  "kia",
  "do",
  "vay",
  "sao",
  "thi",
  "de",
  "va",
  "hay",
  "di",
  "a",
  "ah",
  "uh",
  "ok",
  "nhi",
  "nhiu",
  "cuon",
  "sach",
  "quyen",
  "tua",
  "dau sach",
  "muon",
  "hoc",
  "tim",
  "ve",
]);

const CASUAL_REPLACEMENTS = [
  { from: /\bship\b/g, to: "giao hang" },
  { from: /\brefund\b/g, to: "hoan tien" },
  { from: /\breturn\b/g, to: "doi tra" },
  { from: /\bfront[\s-]?end\b/g, to: "frontend" },
  { from: /\bback[\s-]?end\b/g, to: "backend" },
  { from: /\breactjs\b/g, to: "react" },
  { from: /\bnodejs\b/g, to: "node js" },
  { from: /\bjs ui\b/g, to: "frontend react" },
  { from: /\bsv it\b/g, to: "sinh vien it" },
  { from: /\bnewbie\b/g, to: "nguoi moi" },
  { from: /\bnoob\b/g, to: "nguoi moi" },
  { from: /\bko\b/g, to: "khong" },
  { from: /\bk\b/g, to: "khong" },
  { from: /\bhok\b/g, to: "hoc" },
];

const CONCEPT_DEFINITIONS = {
  shipping_policy: {
    aliases: ["van chuyen", "giao hang", "ship", "delivery", "phi ship", "thoi gian giao"],
    expansions: ["chinh sach van chuyen", "giao hang", "ship"],
  },
  return_policy: {
    aliases: ["doi tra", "hoan tien", "tra hang", "refund", "return", "bao hanh doi", "doi duoc khong", "doi duoc"],
    expansions: ["chinh sach doi tra", "hoan tien", "doi tra"],
  },
  support_contact: {
    aliases: ["lien he", "ho tro", "support", "contact", "chat voi shop", "ticket"],
    expansions: ["lien he ho tro", "cham soc khach hang"],
  },
  beginner: {
    aliases: ["nguoi moi", "moi hoc", "de tiep can", "co ban", "nhap mon", "de hoc", "de hieu"],
    expansions: ["danh cho nguoi moi", "co ban"],
  },
  frontend: {
    aliases: ["frontend", "react", "giao dien", "ui", "javascript ui", "web ui"],
    expansions: ["frontend", "react", "javascript"],
  },
  backend: {
    aliases: ["backend", "node", "node js", "server", "api", "express"],
    expansions: ["backend", "node js", "server"],
  },
  recommendation: {
    aliases: ["goi y", "de xuat", "nen doc", "nen mua", "co cuon nao", "phu hop", "suggest", "muon sach", "sach cho"],
    expansions: ["goi y sach", "de xuat sach"],
  },
  same_author: {
    aliases: ["cung tac gia", "same author", "tac gia giong", "cung nguoi viet"],
    expansions: ["cung tac gia"],
  },
  same_category: {
    aliases: ["cung the loai", "same category", "the loai giong", "cung genre"],
    expansions: ["cung the loai"],
  },
  cheaper: {
    aliases: ["re hon", "gia re hon", "gia mem hon", "cheap", "re hơn", "muc gia thap hon"],
    expansions: ["re hon", "gia mem hon"],
  },
  related_next: {
    aliases: ["doc gi tiep", "nen doc gi tiep", "cuon tiep theo", "related next", "doc tiep", "tiep theo"],
    expansions: ["doc tiep theo", "goi y lien quan"],
  },
  explain: {
    aliases: ["vi sao goi y", "tai sao goi y", "vi sao ban goi y", "tai sao ban goi y", "why recommend", "ly do goi y"],
    expansions: ["giai thich goi y"],
  },
  current_product_reference: {
    aliases: ["cuon nay", "sach nay", "cuon do", "san pham nay", "book nay"],
    expansions: ["san pham dang xem"],
  },
  sort_price_asc: {
    aliases: ["re nhat", "gia thap nhat", "it tien nhat", "tiet kiem nhat", "gia mem nhat"],
    expansions: ["gia thap nhat"],
  },
  sort_price_desc: {
    aliases: ["dat nhat", "gia cao nhat", "cao cap nhat", "xa xi nhat"],
    expansions: ["gia cao nhat"],
  },
  sort_popularity_desc: {
    aliases: ["ban chay nhat", "hot nhat", "pho bien nhat", "duoc mua nhieu nhat"],
    expansions: ["ban chay nhat"],
  },
  sort_date_desc: {
    aliases: ["moi nhat", "vua ve", "moi nhap", "hang moi"],
    expansions: ["moi nhat"],
  },
  database: {
    aliases: ["mongodb", "nosql", "sql", "co so du lieu", "database", "data intensive", "db"],
    expansions: ["mongodb", "data", "database", "backend"],
  },
};

const normalize = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const applyCasualReplacements = (normalized = "") => {
  let out = normalized;
  for (const replacement of CASUAL_REPLACEMENTS) {
    out = out.replace(replacement.from, replacement.to);
  }
  return out.replace(/\s+/g, " ").trim();
};

const tokenize = (text = "") => {
  const n = normalize(text);
  if (!n) {
    return [];
  }
  return n
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
};

const hasPhrase = (normalizedText, phrase) => {
  if (!normalizedText || !phrase) {
    return false;
  }
  const pattern = new RegExp(`(?:^|\\s)${escapeRegex(phrase)}(?:$|\\s)`, "i");
  return pattern.test(normalizedText);
};

const collectConcepts = (normalizedText, tokens = []) => {
  const concepts = [];
  const tokenSet = new Set(tokens);
  for (const [key, definition] of Object.entries(CONCEPT_DEFINITIONS)) {
    const aliases = definition.aliases || [];
    const matched = aliases.some((alias) => {
      const aliasNorm = normalize(alias);
      if (!aliasNorm) {
        return false;
      }
      if (aliasNorm.includes(" ")) {
        return hasPhrase(normalizedText, aliasNorm);
      }
      return tokenSet.has(aliasNorm) || hasPhrase(normalizedText, aliasNorm);
    });
    if (matched) {
      concepts.push(key);
    }
  }
  return concepts;
};

const expandTokens = (tokens = [], concepts = []) => {
  const out = new Set(tokens);
  for (const concept of concepts) {
    const definition = CONCEPT_DEFINITIONS[concept];
    if (!definition) {
      continue;
    }
    for (const expansion of definition.expansions || []) {
      for (const token of tokenize(expansion)) {
        out.add(token);
      }
    }
    out.add(concept);
  }
  return Array.from(out);
};

const buildRewrittenQuery = ({ normalizedText, concepts = [], context = {} }) => {
  const parts = [normalizedText];
  for (const concept of concepts) {
    const definition = CONCEPT_DEFINITIONS[concept];
    if (!definition) {
      continue;
    }
    for (const expansion of definition.expansions || []) {
      parts.push(normalize(expansion));
    }
  }
  if ((context.lastProductId || "").trim()) {
    parts.push("san pham dang xem");
  }
  return Array.from(new Set(parts.filter(Boolean))).join(" ");
};

const analyzeQuery = (raw = "", { context = {} } = {}) => {
  const normalizedRaw = normalize(raw);
  const normalizedText = applyCasualReplacements(normalizedRaw);
  const baseTokens = tokenize(normalizedText);
  const concepts = collectConcepts(normalizedText, baseTokens);
  const expandedTokens = expandTokens(baseTokens, concepts);
  const rewrittenQuery = buildRewrittenQuery({ normalizedText, concepts, context });
  return {
    rawQuery: raw || "",
    normalizedQuery: normalizedText,
    baseTokens,
    expandedTokens,
    concepts,
    rewrittenQuery,
    hasCurrentProductReference: concepts.includes("current_product_reference"),
  };
};

module.exports = {
  normalize,
  tokenize,
  analyzeQuery,
  CONCEPT_DEFINITIONS,
};
