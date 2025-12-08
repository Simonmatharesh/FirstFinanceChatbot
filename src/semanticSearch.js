import cosineSimilarity from "compute-cosine-similarity";

export function findBestMatch(userEmbedding, kbWithEmbeddings) {
  let best = null;
  let highestScore = -1;

  for (const item of kbWithEmbeddings) {
    const score = cosineSimilarity(userEmbedding, item.embedding);
    if (score > highestScore) {
      highestScore = score;
      best = item;
    }
  }

  return best;
}
