// ==UserScript==
// @name         Shopee Advanced Search
// @namespace    https://github.com/icetbr/userscripts
// @version      1.10.0
// @description  Ordena os produtos da Shopee pela quantidade de vendidos
// @author       icetbr
// @match        https://shopee.com.br/*
// @grant        none
// ==/UserScript==

const CARD_SELECTOR = 'li[data-sqe="item"]';
const SOLD_SELECTOR = '.text-shopee-black87.text-xs.min-h-4.flex-shrink';
const TITLE_TEXT_SELECTOR = '.whitespace-normal.line-clamp-2';
const SORT_LABEL_SELECTOR = '.shopee-sort-bar__label';
const productCache = new WeakMap();

function parseSold(text) {
    const value = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    const match = value.match(/([\d]+(?:[.,]\d+)?)\s*(mil|k)?\s*\+?\s*vendid/i);

    if (!match) return null;

    const number = Number.parseFloat(match[1].replace(',', '.'));
    if (!Number.isFinite(number)) return null;

    return number * (match[2] ? 1000 : 1);
}

function getSold(card) {
    if (productCache.has(card)) return productCache.get(card);

    const soldElement = card.querySelector(SOLD_SELECTOR);
    const sold = soldElement ? parseSold(soldElement.textContent) : null;
    productCache.set(card, sold);
    return sold;
}

function addTitleStyle() {
    if (document.querySelector('#shopee-sold-sort-title-style')) return;

    const style = document.createElement('style');
    style.id = 'shopee-sold-sort-title-style';
    style.textContent = `
        ${CARD_SELECTOR} ${TITLE_TEXT_SELECTOR} {
            display: -webkit-box !important;
            -webkit-line-clamp: unset !important;
            -webkit-box-orient: initial !important;
            overflow: visible !important;
            max-height: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getCards(container) {
    return Array.from(container.querySelectorAll(CARD_SELECTOR));
}

async function loadAllProducts(container, button) {
    const originalScrollY = window.scrollY;
    const maxLoadTime = 45000;
    const startedAt = Date.now();
    let stableBottomPasses = 0;
    let lastCount = getCards(container).length;

    button.disabled = true;
    button.textContent = 'Carregando produtos…';
    button.style.cursor = 'wait';

    try {
        // Scroll in small steps so Shopee's lazy-loading triggers each section.
        while (Date.now() - startedAt < maxLoadTime) {
            const step = Math.max(300, Math.floor(window.innerHeight * 0.75));
            const bottom = document.documentElement.scrollHeight - window.innerHeight;
            const nextY = Math.min(window.scrollY + step, bottom);
            window.scrollTo(0, nextY);
            await wait(350);

            const count = getCards(container).length;
            const atBottom = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;

            if (atBottom) {
                if (count === lastCount) stableBottomPasses++;
                else stableBottomPasses = 0;
                if (stableBottomPasses >= 4) break;
            } else {
                stableBottomPasses = 0;
            }

            lastCount = count;
        }

        // Let the final lazy-loaded batch finish before sorting.
        await wait(500);
        sortCards(container);
    } finally {
        window.scrollTo(0, originalScrollY);
        button.disabled = false;
        button.textContent = 'Vendidos';
        button.style.cursor = 'pointer';
    }
}

function sortCards(container) {
    const cards = getCards(container);
    if (cards.length < 2) return;

    const sorted = cards.map((card, index) => ({
        card,
        index,
        sold: getSold(card)
    }));

    sorted.sort((a, b) => {
        if (a.sold === null && b.sold === null) return a.index - b.index;
        if (a.sold === null) return 1;
        if (b.sold === null) return -1;
        return b.sold - a.sold || a.index - b.index;
    });

    if (sorted.every((item, index) => item.card === cards[index])) return;

    const fragment = document.createDocumentFragment();
    for (const item of sorted) fragment.appendChild(item.card);
    container.appendChild(fragment);
}

let sortBarObserver;
let observedSortBar;
let observedSortBarParent;

function addSortButton() {
    const label = document.querySelector(SORT_LABEL_SELECTOR);
    if (!label) return false;

    const sortBar = label.closest('.shopee-sort-bar') || label.parentElement;
    if (!sortBar) return false;

    let button = sortBar.querySelector('#shopee-sort-sold-button');
    if (!button) {
        button = document.createElement('button');
        button.id = 'shopee-sort-sold-button';
        button.type = 'button';
        button.textContent = 'Vendidos';
        button.style.cssText = `
            display: inline-block;
            margin-left: 10px;
            padding: 5px 10px;
            border: 1px solid #ee4d2d;
            border-radius: 2px;
            background: #fff;
            color: #ee4d2d;
            font: inherit;
            cursor: pointer;
            vertical-align: middle;
        `;

        button.addEventListener('click', () => {
            const firstCard = document.querySelector(CARD_SELECTOR);
            const productContainer = firstCard?.parentElement;
            if (productContainer) loadAllProducts(productContainer, button);
        });
    }

    // Insert immediately after the label. Shopee may rebuild this toolbar,
    // so the observer below calls this again if React removes our button.
    if (label.nextElementSibling !== button) {
        label.insertAdjacentElement('afterend', button);
    }

    watchSortBar(sortBar);
    return true;
}

function watchSortBar(sortBar) {
    const parent = sortBar.parentElement;
    if (sortBar === observedSortBar && parent === observedSortBarParent) return;

    sortBarObserver?.disconnect();
    observedSortBar = sortBar;
    observedSortBarParent = parent;

    sortBarObserver = new MutationObserver(() => {
        // The label node itself can also be replaced during a Shopee rerender.
        addSortButton();
    });

    sortBarObserver.observe(sortBar, { childList: true });
    if (parent) sortBarObserver.observe(parent, { childList: true });
}

function init() {
    addTitleStyle();
    addSortButton();

    // Shopee uses client-side navigation, so the page can become a search
    // route after this script starts. It can also replace the toolbar's
    // ancestors, which disconnects the local MutationObserver. Recheck
    // only the search toolbar at a low rate to cover both cases.
    setInterval(() => {
        if (location.pathname.includes('/search')) addSortButton();
    }, 1000);
}

init();
