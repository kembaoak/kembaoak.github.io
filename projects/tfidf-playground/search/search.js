import { buildIndex, tokenize } from "./tfidf.js";

// Relevance formula from CPSC 5330 Homework 4's search.py (compute_doc_relevance):
// average, over every query term (duplicates included), of that term's TF-IDF
// weight in the document -- 0 for terms the document doesn't contain.
function relevance(vec, queryTerms) {
    if (queryTerms.length === 0) return 0;
    const total = queryTerms.reduce((sum, t) => sum + (vec[t] || 0), 0);
    return total / queryTerms.length;
}

const BOOKS = [
    { id: "job1", file: "job1.txt", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", color: "var(--g-blue)" },
    { id: "job2", file: "job2.txt", title: "Pride and Prejudice", author: "Jane Austen", color: "var(--g-red)" },
    { id: "job3", file: "job3.txt", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", color: "var(--g-yellow)" },
];

const MIN_PARAGRAPH_LEN = 60;

const homeView = document.getElementById("home-view");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultsMeta = document.getElementById("results-meta");

let index = null; // { vectors, idf }
let paragraphs = []; // { book, text }

function splitParagraphs(book, rawText) {
    return rawText
        .split(/\n\s*\n+/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter((p) => p.length >= MIN_PARAGRAPH_LEN)
        .map((text) => ({ book, text }));
}

async function loadCorpus() {
    statusEl.textContent = "Indexing books…";
    const texts = await Promise.all(
        BOOKS.map((b) => fetch(b.file).then((r) => r.text()))
    );
    paragraphs = BOOKS.flatMap((book, i) => splitParagraphs(book.id, texts[i]));
    index = buildIndex(paragraphs.map((p) => p.text));
    statusEl.textContent = `Indexed ${paragraphs.length.toLocaleString()} passages across ${BOOKS.length} books.`;
}

function highlight(text, queryTerms) {
    if (queryTerms.length === 0) return text;
    const pattern = new RegExp(`\\b(${queryTerms.map(escapeRegExp).join("|")})\\b`, "gi");
    return text.replace(pattern, "<mark>$1</mark>");
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function snippetAround(text, queryTerms, radius = 160) {
    if (text.length <= radius * 2) return text;
    const lower = text.toLowerCase();
    const hit = queryTerms.map((t) => lower.indexOf(t)).find((i) => i !== -1);
    const center = hit === undefined || hit === -1 ? 0 : hit;
    const start = Math.max(0, center - radius);
    const end = Math.min(text.length, center + radius);
    return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

function runSearch() {
    const query = searchInput.value.trim();
    if (!query || !index) {
        resultsEl.innerHTML = "";
        resultsMeta.textContent = "";
        return;
    }

    const queryTerms = tokenize(query);

    const ranked = paragraphs
        .map((p, i) => ({ p, score: relevance(index.vectors[i], queryTerms) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    resultsMeta.textContent = ranked.length
        ? `About ${ranked.length} results`
        : "No results found.";

    const topScore = ranked.length ? ranked[0].score : 1;

    resultsEl.innerHTML = ranked
        .map(({ p, score }) => {
            const book = BOOKS.find((b) => b.id === p.book);
            const snippet = highlight(snippetAround(p.text, queryTerms), queryTerms);
            const displayScore = Math.round(score * 100);
            const barPct = Math.max(6, Math.round((score / topScore) * 100));
            return `
                <article class="result">
                    <div class="result-book" style="color:${book.color}">${book.title} <span class="result-author">— ${book.author}</span></div>
                    <p class="result-snippet">${snippet}</p>
                    <div class="relevance">
                        <span class="relevance-label">relevance</span>
                        <div class="relevance-bar"><div class="relevance-fill" style="width:${barPct}%;background:${book.color}"></div></div>
                        <span class="relevance-score">${displayScore}</span>
                    </div>
                </article>
            `;
        })
        .join("");
}

searchBtn.addEventListener("click", () => {
    homeView.classList.add("searched");
    runSearch();
});
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        homeView.classList.add("searched");
        runSearch();
    }
});

loadCorpus();
