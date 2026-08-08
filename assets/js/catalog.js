(function initializeCatalog() {
  const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function reveal(node) {
    node.classList.add('reveal', 'is-visible');
    return node;
  }

  function showEmpty(container, message) {
    const empty = element('div', 'empty-state', message);
    container.replaceChildren(empty);
  }

  function announceUpdate(type) {
    document.body.dataset.catalogSource = 'database';
    document.dispatchEvent(new CustomEvent('catalog:updated', { detail: { type } }));
  }

  function renderColors(colors) {
    const grid = document.querySelector('[data-color-grid]');
    const filter = document.querySelector('[data-color-filter]');
    if (!grid || !filter) return;

    const selectedCollection = filter.value;
    const collections = [...new Set(colors.map((color) => color.collection))];
    const allOption = element('option', '', 'Todas as coleções');
    allOption.value = 'all';
    const options = collections.map((collection) => {
      const option = element('option', '', collection);
      option.value = collection;
      return option;
    });
    filter.replaceChildren(allOption, ...options);
    filter.value = collections.includes(selectedCollection) ? selectedCollection : 'all';

    if (!colors.length) {
      showEmpty(grid, 'Nenhuma cor disponível no momento.');
      announceUpdate('colors');
      return;
    }

    const cards = colors.map((color) => {
      const card = reveal(element('article', 'color-card'));
      card.dataset.colorCard = '';
      card.dataset.search = `${color.name} ${color.code} ${color.collection} ${color.finish}`;
      card.dataset.collection = color.collection;

      const swatch = element('div', 'color-card__swatch');
      swatch.style.setProperty('--swatch', color.hex);
      swatch.append(element('span', '', color.code));

      const content = element('div', 'color-card__content');
      const copy = element('div');
      copy.append(element('h3', '', color.name), element('p', '', color.collection));
      content.append(copy, element('span', 'tag', color.finish));
      card.append(swatch, content);
      return card;
    });

    grid.replaceChildren(...cards);
    announceUpdate('colors');
  }

  function renderModels(models) {
    const grid = document.querySelector('[data-model-grid]');
    const filters = document.querySelector('[data-model-filters]');
    if (!grid || !filters) return;

    const activeCategory = filters.querySelector('.is-active')?.dataset.modelFilter || 'all';
    const categories = [...new Set(models.map((model) => model.category))];
    const allButton = element('button', 'chip is-active', 'Todos');
    allButton.type = 'button';
    allButton.dataset.modelFilter = 'all';
    const buttons = categories.map((category) => {
      const button = element('button', 'chip', category);
      button.type = 'button';
      button.dataset.modelFilter = category;
      return button;
    });
    filters.replaceChildren(allButton, ...buttons);
    const nextActive = categories.includes(activeCategory) ? activeCategory : 'all';
    filters.querySelector(`[data-model-filter="${CSS.escape(nextActive)}"]`)?.classList.add('is-active');
    if (nextActive !== 'all') allButton.classList.remove('is-active');

    if (!models.length) {
      showEmpty(grid, 'Nenhum modelo disponível no momento.');
      announceUpdate('models');
      return;
    }

    const whatsappUrl = document.querySelector('.floating-whatsapp')?.href || 'contato.html';
    const cards = models.map((model) => {
      const card = reveal(element('article', 'portfolio-card'));
      card.dataset.modelCard = '';
      card.dataset.category = model.category;

      const visual = element('div', 'portfolio-card__image');
      const image = element('img');
      image.src = model.image_url;
      image.alt = `Modelo de unhas ${model.title}`;
      image.loading = 'lazy';
      visual.append(image, element('span', '', model.category));

      const content = element('div', 'portfolio-card__content');
      const link = element('a', '', 'Quero este estilo →');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      content.append(element('h3', '', model.title), element('p', '', model.description), link);
      card.append(visual, content);
      return card;
    });

    grid.replaceChildren(...cards);
    announceUpdate('models');
  }

  function renderPricing(categories, items) {
    const grid = document.querySelector('[data-pricing-grid]');
    if (!grid) return;

    if (!categories.length) {
      showEmpty(grid, 'A tabela de valores está sendo atualizada.');
      announceUpdate('pricing');
      return;
    }

    const cards = categories.map((category, index) => {
      const card = reveal(element('article', 'price-card'));
      const header = element('header');
      const number = element('span', '', String(index + 1).padStart(2, '0'));
      const heading = element('div');
      heading.append(element('h2', '', category.name), element('p', '', category.subtitle));
      header.append(number, heading);

      const list = element('div', 'price-list');
      const categoryItems = items.filter((item) => item.category_id === category.id);
      if (!categoryItems.length) {
        list.append(element('div', 'price-item price-item--empty', 'Nenhum serviço nesta categoria.'));
      } else {
        categoryItems.forEach((item) => {
          const row = element('div', 'price-item');
          const copy = element('div');
          copy.append(element('strong', '', item.service), element('small', '', item.note || ''));
          row.append(copy, element('span', '', currency.format(Number(item.price))));
          list.append(row);
        });
      }

      card.append(header, list);
      return card;
    });

    grid.replaceChildren(...cards);
    announceUpdate('pricing');
  }

  async function loadColors(client) {
    const { data, error } = await client
      .from('gel_colors')
      .select('id,name,code,hex,finish,collection,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    renderColors(data || []);
  }

  async function loadModels(client) {
    const { data, error } = await client
      .from('nail_models')
      .select('id,title,category,description,image_url,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw error;
    renderModels(data || []);
  }

  async function loadPricing(client) {
    const [categoryResult, itemResult] = await Promise.all([
      client
        .from('price_categories')
        .select('id,name,subtitle,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      client
        .from('price_items')
        .select('id,category_id,service,price,note,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('service', { ascending: true }),
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (itemResult.error) throw itemResult.error;
    renderPricing(categoryResult.data || [], itemResult.data || []);
  }

  async function loadCatalog() {
    const client = window.GesieleSupabase?.getClient();
    if (!client) return;

    try {
      const page = document.body.dataset.page;
      if (page === 'colors') await loadColors(client);
      if (page === 'models') await loadModels(client);
      if (page === 'pricing') await loadPricing(client);
    } catch (error) {
      document.body.dataset.catalogSource = 'fallback';
      console.warn('Não foi possível atualizar o catálogo. O conteúdo local foi mantido.', error.message);
    }
  }

  loadCatalog();
}());
