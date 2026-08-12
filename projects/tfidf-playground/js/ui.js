import { tfidfVectors, cosineSimilarity, topTerms, tokenize, termFrequency } from "./tfidf.js";

const SAMPLE_DOCS = [
    "The cat sat on the mat. The cat was a small orange cat that liked to nap in the sun all afternoon.",
    "The dog ran across the yard chasing a ball. The dog was energetic and loved to play fetch every single day.",
    "Stock markets rallied today as investors reacted to strong earnings reports from several major technology companies.",
];

const docList = document.getElementById("doc-list");
const addDocBtn = document.getElementById("add-doc");
const analyzeBtn = document.getElementById("analyze");
const keywordsOut = document.getElementById("keywords-output");
const similarityOut = document.getElementById("similarity-output");
const queryInput = document.getElementById("query-input");
const queryOut = document.getElementById("query-output");

let docCount = 0;

function addDocument(text = "") {
    docCount += 1;
    const id = docCount;
    const row = document.createElement("div");
    row.className = "doc-row";
    row.dataset.id = id;
    row.innerHTML = `
        <div class="doc-row-head">
            <span class="doc-label">Document ${id}</span>
            <button type="button" class="remove-doc" aria-label="Remove document ${id}">&times;</button>
        </div>
        <textarea rows="3">${text}</textarea>
    `;
    row.querySelector(".remove-doc").addEventListener("click", () => {
        row.remove();
        renumberDocs();
    });
    docList.appendChild(row);
}

function renumberDocs() {
    [...docList.children].forEach((row, i) => {
        row.querySelector(".doc-label").textContent = `Document ${i + 1}`;
    });
}

function getDocs() {
    return [...docList.querySelectorAll("textarea")]
        .map((t) => t.value.trim())
        .filter((v) => v.length > 0);
}

function analyze() {
    const docs = getDocs();
    if (docs.length < 2) {
        keywordsOut.innerHTML = `<p class="empty">Add at least 2 documents to analyze.</p>`;
        similarityOut.innerHTML = "";
        return;
    }

    const vectors = tfidfVectors(docs);

    keywordsOut.innerHTML = vectors
        .map((vec, i) => {
            const terms = topTerms(vec)
                .map(([term, score]) => `<span class="term">${term} <span class="score">${score.toFixed(3)}</span></span>`)
                .join("");
            return `<div class="result-row"><strong>Document ${i + 1}</strong><div class="term-list">${terms}</div></div>`;
        })
        .join("");

    let simRows = "";
    for (let i = 0; i < docs.length; i++) {
        for (let j = i + 1; j < docs.length; j++) {
            const sim = cosineSimilarity(vectors[i], vectors[j]);
            simRows += `<div class="result-row"><span>Document ${i + 1} &harr; Document ${j + 1}</span><span class="score">${sim.toFixed(3)}</span></div>`;
        }
    }
    similarityOut.innerHTML = simRows;

    runQuery();
}

function runQuery() {
    const docs = getDocs();
    const query = queryInput.value.trim();
    if (docs.length < 2 || !query) {
        queryOut.innerHTML = "";
        return;
    }
    const vectors = tfidfVectors(docs);
    const queryVec = termFrequency(tokenize(query));
    const ranked = vectors
        .map((vec, i) => ({ i, score: cosineSimilarity(queryVec, vec) }))
        .sort((a, b) => b.score - a.score);

    queryOut.innerHTML = ranked
        .map(({ i, score }) => `<div class="result-row"><span>Document ${i + 1}</span><span class="score">${score.toFixed(3)}</span></div>`)
        .join("");
}

addDocBtn.addEventListener("click", () => addDocument());
analyzeBtn.addEventListener("click", analyze);
queryInput.addEventListener("input", runQuery);

SAMPLE_DOCS.forEach(addDocument);
analyze();
