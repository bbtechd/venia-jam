import { lookupPages, readBlockConfig } from '../../scripts/scripts.js';
import { createProductCard } from '../product-carousel/product-carousel.js';

export default async function decorate(block) {
  const addEventListeners = (elements, event, callback) => {
    elements.forEach((e) => {
      e.addEventListener(event, callback);
    });
  };

  let config = [...document.querySelectorAll('a')].map((a) => new URL(a.href).pathname);
  if (!config.length) config = readBlockConfig(block);

  block.innerHTML = `<div class="products-controls">
      <p class="products-results-count"><span id="products-results-count"></span> Results</p>
      <button class="products-filter-button secondary">Filter</button>
      <button class="products-sort-button secondary">Sort</button>
    </div>
    <div class="products-facets">
    </div>
    <div class="products-sortby">
      <p>Sort By <span data-sort="best" id="products-sortby">Best Match</span></p>
      <ul>
        <li data-sort="best">Best Match</li>
        <li data-sort="position">Position</li>
        <li data-sort="price-desc">Price: High to Low</li>
        <li data-sort="price-asc">Price: Low to High</li>
        <li data-sort="name">Product Name</li>
      </ul>
    </div>
  </div>
  <div class="products-results">
  </div>`;

  const resultsElement = block.querySelector('.products-results');
  const facetsElement = block.querySelector('.products-facets');
  block.querySelector('.products-filter-button').addEventListener('click', () => {
    block.querySelector('.products-facets').classList.toggle('visible');
  });

  addEventListeners([
    block.querySelector('.products-sort-button'),
    block.querySelector('.products-sortby p'),
  ], 'click', () => {
    block.querySelector('.products-sortby ul').classList.toggle('visible');
  });

  const sortList = block.querySelector('.products-sortby ul');
  const selectSort = (selected) => {
    [...sortList.children].forEach((li) => li.classList.remove('selected'));
    selected.classList.add('selected');
    const sortBy = document.getElementById('products-sortby');
    sortBy.textContent = selected.textContent;
    sortBy.dataset.sort = selected.dataset.sort;
    document.getElementById('products-sortby').textContent = selected.textContent;
    block.querySelector('.products-sortby ul').classList.remove('visible');
    // eslint-disable-next-line no-use-before-define
    runSearch(createFilterConfig());
  };

  sortList.addEventListener('click', (event) => {
    selectSort(event.target);
  });

  const displayResults = async (results) => {
    resultsElement.innerHTML = '';
    results.forEach((product) => {
      resultsElement.append(createProductCard(product, 'products'));
    });
  };

  const getSelectedFilters = () => [...block.querySelectorAll('input[type="checkbox"]:checked')];

  const createFilterConfig = () => {
    const filterConfig = { ...config };
    getSelectedFilters().forEach((checked) => {
      const facetKey = checked.name;
      const facetValue = checked.value;
      if (filterConfig[facetKey]) filterConfig[facetKey] += `, ${facetValue}`;
      else filterConfig[facetKey] = facetValue;
    });
    return (filterConfig);
  };

  const displayFacets = (facets, filters) => {
    const selected = getSelectedFilters().map((check) => check.value);
    facetsElement.innerHTML = `<div><div class="products-filters"><h2>Filters</h2>
    <div class="products-filters-selected"></div>
    <p><button class="products-filters-clear secondary">Clear all</button></p>
    <div class="products-filters-facetlist"></div>
    </div>
    <div class="products-apply-filters">
      <button>See Results</button>
    </div></div>`;

    addEventListeners([
      facetsElement.querySelector('.products-apply-filters button'),
      facetsElement.querySelector(':scope > div'),
      facetsElement,
    ], 'click', (event) => {
      if (event.currentTarget === event.target) block.querySelector('.products-facets').classList.remove('visible');
    });

    const selectedFilters = block.querySelector('.products-filters-selected');
    selected.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'products-filters-tag';
      span.textContent = tag;
      span.addEventListener('click', () => {
        document.getElementById(`products-filter-${tag}`).checked = false;
        const filterConfig = createFilterConfig();
        // eslint-disable-next-line no-use-before-define
        runSearch(filterConfig);
      });
      selectedFilters.append(span);
    });

    facetsElement.querySelector('.products-filters-clear').addEventListener('click', () => {
      selected.forEach((tag) => {
        document.getElementById(`products-filter-${tag}`).checked = false;
      });
      const filterConfig = createFilterConfig();
      // eslint-disable-next-line no-use-before-define
      runSearch(filterConfig);
    });

    /* list facets */
    const facetsList = block.querySelector('.products-filters-facetlist');
    const facetKeys = Object.keys(facets);
    facetKeys.forEach((facetKey) => {
      const filter = filters[facetKey];
      const filterValues = filter ? filter.split(',').map((t) => t.trim()) : [];
      const div = document.createElement('div');
      div.className = 'products-facet';
      const h3 = document.createElement('h3');
      h3.innerHTML = facetKey;
      div.append(h3);
      const facetValues = Object.keys(facets[facetKey]);
      facetValues.forEach((facetValue) => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = facetValue;
        input.checked = filterValues.includes(facetValue);
        input.id = `products-filter-${facetValue}`;
        input.name = facetKey;
        const label = document.createElement('label');
        label.setAttribute('for', input.id);
        label.textContent = `${facetValue} (${facets[facetKey][facetValue]})`;
        div.append(input, label);
        input.addEventListener('change', () => {
          const filterConfig = createFilterConfig();
          // eslint-disable-next-line no-use-before-define
          runSearch(filterConfig);
        });
      });
      facetsList.append(div);
    });
  };

  const getPrice = (string) => +string.substr(1);

  const runSearch = async (filterConfig = config) => {
    const facets = { colors: {}, sizes: {} };
    const sorts = {
      name: (a, b) => a.title.localeCompare(b.title),
      'price-asc': (a, b) => getPrice(a.price) - getPrice(b.price),
      'price-desc': (a, b) => getPrice(b.price) - getPrice(a.price),
    };
    const results = await lookupPages(filterConfig, facets);
    const sortBy = document.getElementById('products-sortby') ? document.getElementById('products-sortby').dataset.sort : 'best';
    if (sortBy && sorts[sortBy]) results.sort(sorts[sortBy]);
    block.querySelector('#products-results-count').textContent = results.length;
    displayResults(results, null);
    displayFacets(facets, filterConfig);
  };

  runSearch(config);
}
