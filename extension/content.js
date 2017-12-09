let suggestMenu;

function init() {
  document.body.addEventListener('click', (e) => {
    if (e.target.matches('#mlwe-suggest-menu a')) {
      closeSuggestMenu();
      window.open(e.target.href, 'mlwe-window');
      e.preventDefault();
      return;
    }
    const menu = e.target.closest('#mlwe-suggest-menu');
    if (!menu) {
      closeSuggestMenu();
    }
  });

  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSuggestMenu();
    }
  });

  addIcons();
}

function closeSuggestMenu() {
  if (suggestMenu) {
    suggestMenu.parentNode.removeChild(suggestMenu);
    suggestMenu = null;
  }
}

function buildThumbailUrl(imageName) {
  if (!imageName) return 'https://images.vivino.com/thumbs/default_label_80x80.jpg';
  const path = imageName
    .replace(/^\w+\//, '')
    .replace(/(\w+)(?:\.(jpg|jpeg|png))?$/, (match, m1, m2) => {
      const ext = m2 || 'png';
      return `${m1}_80x80.${ext}`;
    });
  return `https://images.vivino.com/thumbs/${path}`;
}

function openSuggestMenu(title, results, x, y) {
  const items = results.map((item) => {
    const { wine_name, winery_seo_url, image, vintages } = item;
    const keys = Object.keys(vintages);
    const vintage = vintages[keys[keys.length - 1]];
    const href = `https://www.vivino.com/wineries/${winery_seo_url}/wines/${vintage}`;
    const imgUrl = buildThumbailUrl(image);
    const style = imgUrl ? `background-image: url(${imgUrl})` : '';
    return `<li><a style="${style}" title="Ver detalles y precios..." href="${href}">${wine_name}</a></li>`;
  });
  const html = `<div id="mlwe-suggest-menu" class="mlwe-suggest"><h3>${title}</h3><ul>${items.join('')}</ul></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  suggestMenu = document.querySelector('#mlwe-suggest-menu');
  suggestMenu.style.right = x + 'px';
  suggestMenu.style.top = y + 'px';
  suggestMenu.scrollIntoView({
    behavior: 'smooth',
  });
}

const createIcon = (clickHandler, className) => {
  const img = new Image();
  img.src = chrome.runtime.getURL('/images/logo-96.png');
  img.title = 'Buscar en Vivino';
  img.className = 'mlwe-icon';
  if (className) {
    img.classList.add(className);
  }
  img.addEventListener('click', clickHandler);
  return img;
};

function addIcons() {

  const isWineItemView = !!Array.from(document.querySelectorAll('.vip-navigation-breadcrumb-list > li'))
    .map(node => node.textContent.trim())
    .find(text => text.toLowerCase() === 'vinos');

  if (isWineItemView) {
    // single item view
    const root = document.querySelector('.vip-action-primary');
    if (root) {
      const icon = createIcon((e) => {
        const wineName = document.querySelector('.item-title').textContent;
        handleClick(e.target, wineName);
      }, 'mlwe-icon-single-view');
      root.appendChild(icon);
    }
  } else {
    // list view
    const items = document.querySelectorAll('#searchResults > li .rowItem');
    items.forEach((item) => {
      const icon = createIcon((e) => {
        const wineName = e.target.parentNode.querySelector('.item__title a').textContent;
        handleClick(e.target, wineName);
      }, 'mlwe-icon-list-view');
      item.appendChild(icon);
    });
  }
}

async function handleClick(srcIcon, wineName) {
  const iconBounds = srcIcon.getBoundingClientRect();
  const query = findWineName(wineName);
  const results = await doSearch(query);
  const title = results.length > 0 ? 'Resultados encontrados...' : 'No se han encontrado resultados :(';
  const rightX = document.documentElement.scrollLeft + document.body.clientWidth - iconBounds.right;
  const topY = document.documentElement.scrollTop + iconBounds.bottom;
  openSuggestMenu(title, results, rightX, topY);
}

async function doSearch(query) {
  console.log(`Searching for wine "${query}"...`);
  const url = `https://9takgwjuxl-dsn.algolia.net/1/indexes/WINES/query?x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.24.5&x-algolia-application-id=9TAKGWJUXL&x-algolia-api-key=60c11b2f1068885161d95ca068d3a6ae`;
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      "params": `query=${encodeURIComponent(query)}&hitsPerPage=6`
    })
  });
  if (res.ok) {
    const results = await res.json();
    return results.hits;
  }
  return [];
}

function findWineName(text) {
  const name = text.trim().toLowerCase()
    .replace(/\s/g, ' ')
    .replace(/^vino/, '')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/\d+(x\d+)? *(ml|cc|cm3)/, '')
    .replace(/\b(liquido|gratis|envios?|mercado ?envios|caja|box|solo|bebidas?|(gran )?oferta)\b/g, '')
    .replace(/[^a-zñ0-9 _-]/g, '')
    .replace(/- *$/, '')
    .trim();
  return name;
}

init();
