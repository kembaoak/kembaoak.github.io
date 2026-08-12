// From-scratch TF-IDF implementation. Port of TF-IDF/tfidf.py (same formulas,
// validated there against sklearn), plus buildIndex() which also exposes the
// corpus idf map so a typed search query (not itself a corpus document) can
// be scored against it.

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

function l2Normalize(raw) {
    const norm = Math.sqrt(Object.values(raw).reduce((sum, v) => sum + v * v, 0));
    if (!norm) return raw;
    const normalized = {};
    for (const term in raw) {
        normalized[term] = raw[term] / norm;
    }
    return normalized;
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
        return l2Normalize(raw);
    });
}

// Same as tfidfVectors, but also returns the idf map so query vectors
// (built from text outside the corpus) can be scored consistently.
export function buildIndex(docs) {
    const tokenizedDocs = docs.map(tokenize);
    const df = documentFrequency(tokenizedDocs);
    const idf = inverseDocumentFrequency(df, docs.length);

    const vectors = tokenizedDocs.map((tokens) => {
        const tf = termFrequency(tokens);
        const raw = {};
        for (const term in tf) {
            if (term in idf) raw[term] = tf[term] * idf[term];
        }
        return l2Normalize(raw);
    });

    return { vectors, idf };
}

export function queryVector(query, idf) {
    const tf = termFrequency(tokenize(query));
    const raw = {};
    for (const term in tf) {
        if (term in idf) raw[term] = tf[term] * idf[term];
    }
    return raw;
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
