const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'con', 'por', 'para',
  'que', 'como', 'pero', 'mas', 'sin', 'sobre', 'entre', 'hacia', 'desde', 'esta', 'este', 'esto', 'ese',
  'esa', 'son', 'ser', 'fue', 'hay', 'muy', 'ya', 'si', 'no', 'the', 'and', 'for', 'with', 'that', 'this',
  'from', 'into', 'have', 'has', 'are', 'was', 'were', 'can', 'will', 'use', 'using', 'para', 'una',
]);

export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_.-]+/)
    .map((t) => t.replace(/^[._-]+|[._-]+$/g, ''))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function buildTfIdfVectors(documents: string[]): Map<string, number>[] {
  const tokenized = documents.map(tokenizeText);
  const docCount = documents.length;
  const df = new Map<string, number>();

  for (const tokens of tokenized) {
    const unique = new Set(tokens);
    for (const term of unique) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  return tokenized.map((tokens) => {
    const tf = new Map<string, number>();
    for (const term of tokens) {
      tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    const vec = new Map<string, number>();
    const total = Math.max(tokens.length, 1);
    for (const [term, count] of tf.entries()) {
      const idf = Math.log((docCount + 1) / ((df.get(term) ?? 0) + 1)) + 1;
      vec.set(term, (count / total) * idf);
    }
    return vec;
  });
}

export function cosineSimilarityMap(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of a.entries()) {
    normA += valA * valA;
    const valB = b.get(term);
    if (valB !== undefined) {
      dot += valA * valB;
    }
  }
  for (const valB of b.values()) {
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function cosineSimilarityDense(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
