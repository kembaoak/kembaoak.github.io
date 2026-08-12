// From-scratch TF-IDF implementation. Direct JS port of TF-IDF/tfidf.py —
// same formulas (smoothed IDF, L2-normalized output), validated there against sklearn.

const TOKEN_RE = /[a-z0-9]+/g;

export function tokenize(text) {
    return text.toLowerCase().match(TOKEN_RE) || [];
}

export function termFrequency(tokens) {
    const tf = {};
    for (const term of tokens) {
        tf[term] = (tf[term] || 0) + 1;
    }
    return tf;
}

export function documentFrequency(tokenizedDocs) {
    const df = {};
    for (const tokens of tokenizedDocs) {
        for (const term of new Set(tokens)) {
            df[term] = (df[term] || 0) + 1;
        }
    }
    return df;
}

export function inverseDocumentFrequency(df, nDocs) {
    const idf = {};
    for (const term in df) {
        idf[term] = Math.log((1 + nDocs) / (1 + df[term])) + 1;
    }
    return idf;
}

export function tfidfVectors(docs) {
    const tokenizedDocs = docs.map(tokenize);
    const df = documentFrequency(tokenizedDocs);
    const idf = inverseDocumentFrequency(df, docs.length);

    return tokenizedDocs.map((tokens) => {
        const tf = termFrequency(tokens);
        const raw = {};
        for (const term in tf) {
            raw[term] = tf[term] * idf[term];
        }
        const norm = Math.sqrt(Object.values(raw).reduce((sum, v) => sum + v * v, 0));
        if (!norm) return raw;
        const normalized = {};
        for (const term in raw) {
            normalized[term] = raw[term] / norm;
        }
        return normalized;
    });
}

export function cosineSimilarity(vecA, vecB) {
    const termsA = Object.keys(vecA);
    const termsB = new Set(Object.keys(vecB));
    let dot = 0;
    for (const term of termsA) {
        if (termsB.has(term)) dot += vecA[term] * vecB[term];
    }
    const normA = Math.sqrt(Object.values(vecA).reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(Object.values(vecB).reduce((sum, v) => sum + v * v, 0));
    if (!normA || !normB) return 0;
    return dot / (normA * normB);
}

export function topTerms(vec, k = 5) {
    return Object.entries(vec)
        .sort((a, b) => b[1] - a[1])
        .slice(0, k);
}
