
import { knowledgeBase } from "./knowledgeBase.js";
import { embedContent } from "./embeddingAPI.js";

export let kbWithEmbeddings = [];

/**
 * Initialize KB embeddings once at server startup.
 */
export async function initKB() {
  try {
    const texts = knowledgeBase.map(item => item.triggers.join(" | "));
    const embeddings = await embedContent(texts); // number[][]

    kbWithEmbeddings = knowledgeBase.map((item, i) => ({
      ...item,
      embedding: embeddings[i] // number[]
    }));

    console.log("KB initialized with embeddings!");
  } catch (err) {
    console.error("Failed to initialize KB:", err);
    throw err;
  }
}

/* ------------------ (2) ARRAY VALIDATION HELPERS ------------------ */
function isNumericArray(a) {
  return Array.isArray(a) && a.length > 0 && a.every(v => typeof v === "number");
}

/* ------------------ (3) COSINE MATCHER ------------------ */
// We’ll use a tiny cosine implementation to avoid type issues.
function cosine(a, b) {
  if (!isNumericArray(a) || !isNumericArray(b) || a.length !== b.length) {
    return NaN;
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : NaN;
}

/**
 * Finds the best KB item by cosine similarity.
 * @param {number[]} userEmbedding
 * @param {number} threshold - return a match only if score >= threshold
 */
export function findBestMatch(userEmbedding, threshold = 0.5) {
  if (!isNumericArray(userEmbedding)) {
    throw new Error("User embedding is not a numeric array");
  }

  let best = null;
  let highest = -Infinity;

  for (const item of kbWithEmbeddings) {
    const score = cosine(userEmbedding, item.embedding);
    if (Number.isFinite(score) && score > highest) {
      highest = score;
      best = item;
    }
  }

  return highest >= threshold ? best : null;
}
