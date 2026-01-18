// semanticSearch.js
import cosineSimilarity from "compute-cosine-similarity";

/**
 * Find best match with context awareness
 * @param {Array} userEmbedding - User message embedding vector
 * @param {Array} kbWithEmbeddings - Knowledge base with embeddings
 * @param {Object} contextSummary - Current conversation context
 * @param {number} threshold - Minimum score threshold
 */
export function findBestMatch(userEmbedding, kbWithEmbeddings, contextSummary = {}, threshold = 0.70) {
  let bestItem = null;
  let bestScore = -1;

  const { topic, product, nationality } = contextSummary;

  for (const item of kbWithEmbeddings) {
    if (!item.embedding || !Array.isArray(item.embedding)) continue;

    let score = cosineSimilarity(userEmbedding, item.embedding);

    // Context boosting: increase score if item matches current context
    if (topic && item.category === topic) {
      score += 0.15; // Boost items in current topic
    }

    if (product && item.category && item.category.includes(product.toLowerCase())) {
      score += 0.1; // Boost items matching current product
    }

    // Penalize if item is about different nationality than what's in context
    if (nationality && item.category) {
      if (nationality === "Qatari" && item.category.includes("expat")) {
        score -= 0.1;
      } else if (nationality === "Expat" && item.category.includes("qatari")) {
        score -= 0.1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  // Higher threshold to prevent false positives
  if (bestScore < threshold) {
    return null;
  }

  return { ...bestItem, score: bestScore };
}

/**
 * Detect if message is a follow-up question
 */
export function isFollowUp(message) {
  const followUpPatterns = [
    /what about/i,
    /how about/i,
    /for (qatari|expat)/i,
    /is (this|it|that) for/i,
    /what if i('m| am)/i,
    /and (for )?qatari/i,
    /and (for )?expat/i,
    /^(qatari|expat)\??$/i,
    /^for (qatari|expat)/i
  ];

  return followUpPatterns.some(pattern => pattern.test(message));
}

/**
 * Extract product type from message
 */
export function extractProduct(text) {
  const lower = text.toLowerCase();
  
  if (/vehicle|car|auto/i.test(lower)) return "vehicle";
  if (/personal/i.test(lower)) return "personal";
  if (/service|services/i.test(lower)) return "services";
  if (/housing|home|property|real estate/i.test(lower)) return "housing";
  if (/corporate|company|business/i.test(lower)) return "corporate";
  if (/marine|boat|yacht/i.test(lower)) return "marine";
  if (/travel|umrah|holiday/i.test(lower)) return "travel";
  
  return null;
}

/**
 * Extract nationality from message
 */
export function extractNationality(text) {
  if (/qatari|qatar national/i.test(text)) return "Qatari";
  if (/expat|expatriate|resident|foreigner/i.test(text)) return "Expat";
  return null;
}