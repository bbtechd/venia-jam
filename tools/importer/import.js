/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

const MAIN_SELECTOR = '.main-page-3Fo';
const IMAGE_CONTAINER = '.carousel-root-3Sd';
const DESCRIPTION_CONTAINER = '.richContent-root-2XB';
const PRICE_CONTAINER = '.productFullDetail-productPrice-2Ob';
const FASHION_ITEMS_FINDER = '.productFullDetail-options-riy .option-root-20v';
const FASHION_ITEMS = 'button';
const SKU_SELECTOR = '.productFullDetail-details-2Ih strong';
const CATEGORY_SELECTOR = '.breadcrumbs-root-3nF';

const COLOR_CODES = {
  Peach: 'pe',
  Khaki: 'kh',
  Rain: 'rn',
  Mint: 'mt',
  Lily: 'ly',
  Lilac: 'll',
  Latte: 'la',
};

const CODE_COLORS = {};

// eslint-disable-next-line guard-for-in, no-restricted-syntax
for (const key in COLOR_CODES) {
  CODE_COLORS[COLOR_CODES[key]] = key;
}

const makeAbsoluteLinks = (main) => {
  main.querySelectorAll('a').forEach((a) => {
    if (a.href.startsWith('/')) {
      const u = new URL(a.href, 'https://main--venia-jam--bbtechd.hlx.page/');
      a.href = u.toString();
    }
  });
};

function moveDescription(main) {
  const descr = main.querySelector(DESCRIPTION_CONTAINER);
  if (descr) {
    main.append(descr);
  }
}

function computeProductData(main) {
  const result = {};

  const sku = main.querySelector(SKU_SELECTOR);
  if (sku) {
    result.sku = sku.textContent;
  }

  const price = main.querySelector(PRICE_CONTAINER);
  if (price) {
    result.price = price.textContent;
  }

  const fashionFinder = main.querySelectorAll(FASHION_ITEMS_FINDER);

  if (fashionFinder) {
    fashionFinder.forEach((ff) => {
      const fashion = ff.textContent;
      const ffItems = ff.querySelectorAll(FASHION_ITEMS);
      if (ffItems) {
        const items = Array.from(ffItems).map((item) => item.title);
        if (fashion.startsWith('Fashion Color')) {
          result.colors = items;
        } else if (fashion.startsWith('Fashion Size')) {
          result.sizes = items;
        } else {
          console.warn('Unknown fashion item:', fashion);
        }
      }
    });
  }

  return result;
}

function createProductBlock(main, document, colors = []) {
  const getColor = (src) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const key in CODE_COLORS) {
      if (src.includes(key)) {
        return CODE_COLORS[key];
      }
    }
    return '';
  };

  const container = main.querySelector(IMAGE_CONTAINER);
  if (container) {
    const data = [['Product']];
    const imgs = container.querySelectorAll('img');
    const allImages = [];
    if (imgs) {
      imgs.forEach((img) => {
        if (img.src && !img.src.startsWith('data:')) {
          if (img.srcset) {
            const split = img.srcset.replace(/\s+[0-9]+(\.[0-9]+)?[wx]/g, '').split(/,\n/);
            img.src = split[split.length - 1];
            img.src = img.src.replace('main_1', 'main').replace('main_2', 'main');
            img.removeAttribute('srcset');
            img.removeAttribute('width');
            img.removeAttribute('height');
            img.removeAttribute('sizes');
            img.removeAttribute('class');
          }

          if (!allImages.includes(img.src) && (img.src.includes('-') || colors.length === 0)) {
            data.push([img, getColor(img.src)]);
            img.setAttribute('width', '150px');
            allImages.push(img.src);
          }
        }
      });
    }

    const srcRef = allImages[0];
    const root = srcRef.substring(0, srcRef.indexOf('-'));
    const end = srcRef.substring(srcRef.indexOf('_')).replace('_1', '').replace('_2', '');
    colors.forEach((color) => {
      const code = COLOR_CODES[color];
      if (!code) {
        console.warn(`Unknown code for color: ${color}`);
      } else {
        const newSrc = `${root}-${code}${end}`;
        if (!allImages.includes(newSrc)) {
          const img = document.createElement('img');
          img.src = newSrc;
          img.setAttribute('width', '150px');
          data.push([img, getColor(img.src)]);
        }
      }
    });

    const table = WebImporter.DOMUtils.createTable(data, document);
    container.replaceWith(table);

    // main image
    return allImages[0];
  }
  return '';
}

function createMetadata(main, document, extra) {
  const meta = {};

  const h1 = main.querySelector('h1');
  if (h1) {
    meta.Title = h1.textContent;
  }

  const desc = main.querySelector(`${DESCRIPTION_CONTAINER} p`);
  if (desc) {
    meta.Description = desc.textContent;
  }

  const category = main.querySelector(CATEGORY_SELECTOR);
  if (category) {
    const s = category.textContent.split('/');
    meta.Category = s[s.length - 2];
  }

  const {
    image, sku, price, colors, sizes,
  } = extra;

  if (image) {
    const img = document.createElement('img');
    img.src = image;
    meta.Image = img;
  }

  meta.SKU = sku;
  meta.Price = price || '';
  meta.Colors = colors ? colors.join(', ') : '';
  meta.Sizes = sizes ? sizes.join(', ') : '';

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(block);

  return meta;
}

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @returns {HTMLElement} The root element
   */
  transformDOM: (document) => {
    const main = document.querySelector(MAIN_SELECTOR);

    moveDescription(main, document);
    const data = computeProductData(main, document);
    const image = createProductBlock(main, document, data.colors);
    makeAbsoluteLinks(main);
    const meta = createMetadata(main, document, {
      image,
      ...data,
    });

    main.dataset.category = meta.Category ? meta.Category.toLowerCase() : '';

    WebImporter.DOMUtils.remove(main, [
      '.breadcrumbs-root-3nF',
      '.option-selection-Mcv',
      '.productFullDetail-quantity-lZ3',
      '.productFullDetail-actions-bS9',
      '.productFullDetail-descriptionTitle-3f3',
      '.productFullDetail-sectionTitle-2sn',
      '.productFullDetail-description-21i',
      '.productFullDetail-options-riy',
      '.productFullDetail-details-2Ih',
      PRICE_CONTAINER,
    ]);

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {String} url The url of the document being transformed.
   * @param {HTMLDocument} document The document
   */
  generateDocumentPath: (url, document) => {
    const main = document.querySelector(MAIN_SELECTOR);
    const { category } = main.dataset;
    return `/${category}${new URL(url).pathname.replace(/\.html$/, '')}`;
  },
};
