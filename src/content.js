// CONTRIBUTOR NOTE: imports available at github:icetbr/utils
// import { addStyle } from '../../utils/src/web.js';
// http://localhost:10001/test/manual/Meta%20Is%20Transferring%20Jest%20to%20the%20OpenJS%20Foundation%20Hacker%20News.html
import { $, $$, el, toBase64, toSearchable, isBrazil, onMutation } from '@icetbr/utils/web';
import { split } from '@icetbr/utils/misc';

const filterIconSvg = `
    <svg width="26px" height="26px" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
        <g stroke="currentColor">
            <path d="m4.5 7.5h12"/>
            <path d="m6.5 10.5h8"/>
            <path d="m8.5 13.5h4"/>
        </g>
    </svg>`;

const isThousands = string => ['k', 'mil'].some(s => string?.includes(s));

const parseNumber = string => {
    string = string + '';
    let number = parseFloat(string?.replace(',', '.').match(/[\d\.]+/g));
    number = isThousands(string) ? number * 1000 : number;
    return isNaN(number) ? 0 : number;
}

const filter = ($searchedWordsInput, $excludedWordsInput, $soldAtLeastInput, $soldAtMostInput) => () => {
    const $products = $$('.shopee-search-item-result__item');
    const searchedWords = split(toSearchable($searchedWordsInput.value));
    const excludedWords = split(toSearchable($excludedWordsInput.value));
    const soldAtLeast = parseNumber($soldAtLeastInput.value);
    const soldAtMost = parseNumber($soldAtMostInput.value);

    const lacksAllSearchedWords = element => !searchedWords.every(w => element.dataset.searchableText.includes(w));
    const hasAnyExcludedWords = element => excludedWords.some(w => element.dataset.searchableText.includes(w));
    const hasSoldAtLeast = element => element.dataset.soldCount >= soldAtLeast;
    const hasSoldAtMost = element => element.dataset.soldCount <= soldAtMost;

    const withSearchableText = el => {
        const contentEl = el?.firstChild?.firstChild?.firstChild?.firstChild?.children[1];
        const nameEl = contentEl?.children[0]?.children[0];
        el.dataset.searchableText = toSearchable(nameEl?.textContent ?? '');
        return el;
    };

    const withSoldCount = el => {
        const contentEl = el?.firstChild?.firstChild?.firstChild?.firstChild?.children[1];
        const ratingEl = contentEl?.children[1]?.children[1]?.children[2];
        el.dataset.soldCount = parseNumber(ratingEl?.textContent ?? 0);
        return el;
    };

    const toggleHidden = (counts, el) => {
        if (lacksAllSearchedWords(el) || hasAnyExcludedWords(el)) {
            el.style.display = 'none';
            counts[0]++;
        } else if (soldAtLeast && !hasSoldAtLeast(el)){
            el.style.display = 'none';
            counts[1]++;
        } else if (soldAtMost && !hasSoldAtMost(el)){
            el.style.display = 'none';
            counts[2]++;
        } else {
            el.style.display = 'block';
        }
        return counts;
    };

    let $loadedProducts = $products
        .map(withSearchableText)
        .filter(p => p.dataset.searchableText);
    if (soldAtLeast || soldAtMost) {
        $loadedProducts = $loadedProducts.map(withSoldCount);
    }
    const hiddenCounts = $loadedProducts.reduce(toggleHidden, [0, 0, 0]);
    const excludedMsg = excludedWords.length ? ` -'${excludedWords.join(' ')}'` : '';
    console.log(
        $products.length + ' products, ' +
        $loadedProducts.length + ' loaded, ' +
        `${hiddenCounts[0]} hidden for '${searchedWords.join(' ')}'${excludedMsg}, ` +
        `${hiddenCounts[1]} hidden for >= ${soldAtLeast} sold, ` +
        `${hiddenCounts[2]} hidden for <= ${soldAtMost} sold`
    );
};

let filterProducts;
const init = () => {
    if(filterProducts) filterProducts();

    const $searchBar = $('.shopee-searchbar-input');
    if (!$searchBar || $searchBar.querySelector('#excludedWords')) return;

    console.log('shopee filter enabled');

    const $searchedWordsInput = $('.shopee-searchbar-input__input');
    const $soldAtLeastInput = el('input', { id: 'soldAtLeast', style: 'width: 70px;', title: isBrazil() ? 'vendido no mínimo' : 'sold at least', placeholder: isBrazil() ? 'vendido >=' : 'sold >=', onkeyup: function(e) { if (e.key === 'Enter') filterProducts(); } });
    const $soldAtMostInput = el('input', { id: 'soldAtMost', style: 'width: 70px;', title: isBrazil() ? 'vendido no máximo' : 'sold at most', placeholder: isBrazil() ? 'vendido <=' : 'sold <=', onkeyup: function(e) { if (e.key === 'Enter') filterProducts(); } });
    const $excludedWordsInput = el('input', { id: 'excludedWords', placeholder: isBrazil() ? 'excluir palavras' : 'exclude words', onkeyup: function(e) { if (e.key === 'Enter') filterProducts(); } });
    filterProducts = filter($searchedWordsInput, $excludedWordsInput, $soldAtLeastInput, $soldAtMostInput);

    const $filterButton = el('button', {
        type: 'button',
        style: `
            background: no-repeat url(${toBase64(filterIconSvg)});
            padding: 13px;
            margin-top: 3px;
            border: none;
        `,
    });
    $filterButton.addEventListener('click', filterProducts)

    $searchBar.appendChild($soldAtMostInput);
    $searchBar.appendChild($soldAtLeastInput);
    $searchBar.appendChild($excludedWordsInput);
    $searchBar.appendChild($filterButton);
};

// shopee makes it hard to know when I can apped UI elements, so calling "init" on mutation is better than calling "filterProducts"
onMutation(init);
// setInterval(init, 2000)

// .shopee_ic .flex-1 flex 1 1 auto
