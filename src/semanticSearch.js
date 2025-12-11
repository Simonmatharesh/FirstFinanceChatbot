import cosineSimilarity from "compute-cosine-similarity";

export function findBestMatch(userEmbedding, kbWithEmbeddings, threshold = 0.40) {
  let bestItem = null;
  let bestScore = -1;

  for (const item of kbWithEmbeddings) {
    if (!item.embedding || !Array.isArray(item.embedding)) continue;

    const score = cosineSimilarity(userEmbedding, item.embedding);

    // Debug (optional):
    // console.log("Trigger:", item.triggers.join(" | "), "Score:", score);

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  // If best score is below acceptable threshold → no match
  if (bestScore < threshold) {
    return null;
  }

  return { ...bestItem, score: bestScore };
}
