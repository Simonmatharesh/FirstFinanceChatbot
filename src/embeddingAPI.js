
// embeddings.js 
import { pipeline } from "@xenova/transformers";

let embedder = null;

export async function initEmbedder() {
  if (embedder) return;
  // Use the ONNX web-ready model id
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

// Return a single vector (number[]) for a string,
// or an array of vectors for an array of strings.
export async function embedContent(texts) {
  if (!embedder) throw new Error("Embedder not initialized");

  const input = Array.isArray(texts) ? texts : [texts];
  const results = [];

  for (const t of input) {
    //  Mean pooling + L2 normalize gives a sentence-level vector
    const tensor = await embedder(t, { pooling: "mean", normalize: true });
    const vector = tensor.tolist(); // <-- plain number[]
    results.push(vector);
  }

  return Array.isArray(texts) ? results : results[0];
}
