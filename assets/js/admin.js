(function initializeAdmin() {
  const configView = document.querySelector('[data-config-view]');
  const authView = document.querySelector('[data-auth-view]');
  const adminView = document.querySelector('[data-admin-view]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginMessage = document.querySelector('[data-login-message]');
  const logoutButton = document.querySelector('[data-admin-logout]');
  const userLabel = document.querySelector('[data-admin-user]');
  const syncLabel = document.querySelector('[data-admin-sync]');
  const toast = document.querySelector('[data-admin-toast]');
  const homeForm = document.querySelector('[data-home-form]');
  const homeImageInput = homeForm.querySelector('[name="hero_image"]');
  const homeMessage = document.querySelector('[data-home-form-message]');
  const homePreviewImage = document.querySelector('[data-home-preview-image]');
  const homePlaceholder = document.querySelector('[data-home-placeholder]');
  const homeMigrationNote = document.querySelector('[data-home-migration]');
  const removeHomeImageButton = document.querySelector('[data-remove-home-image]');

  const state = {
    client: null,
    user: null,
    home: { id: 'home', hero_image_url: null, hero_image_path: null },
    homeSettingsAvailable: true,
    colors: [],
    models: [],
    categories: [],
    prices: [],
    toastTimer: null,
    previewUrl: null,
    homePreviewUrl: null,
  };

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

  function field(form, name) {
    return form.elements.namedItem(name);
  }

  function showView(view) {
    configView.hidden = view !== 'config';
    authView.hidden = view !== 'auth';
    adminView.hidden = view !== 'admin';
    const authenticated = view === 'admin';
    logoutButton.hidden = !authenticated;
    userLabel.hidden = !authenticated;
  }

  function setMessage(target, message, success = false) {
    target.textContent = message;
    target.classList.toggle('is-success', success);
  }

  function showToast(message, isError = false) {
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function setSubmitting(form, submitting) {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = submitting;
    submit.textContent = submitting ? 'Salvando...' : submit.dataset.label || submit.textContent;
  }

  function actionButton(label, onClick, danger = false) {
    const button = element('button', danger ? 'is-danger' : '', label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
  }

  function statusBadge(active) {
    return element('span', `admin-status${active ? '' : ' is-hidden'}`, active ? 'Ativo' : 'Oculto');
  }

  function emptyNode(message, tag = 'div') {
    return element(tag, 'admin-empty', message);
  }

  function nextOrder(records) {
    return records.length ? Math.max(...records.map((record) => Number(record.sort_order) || 0)) + 10 : 10;
  }

  function setHomePreview(url) {
    homePreviewImage.hidden = !url;
    homePlaceholder.hidden = Boolean(url);
    if (url) homePreviewImage.src = url;
    else homePreviewImage.removeAttribute('src');
  }

  function clearHomePreviewUrl() {
    if (state.homePreviewUrl) URL.revokeObjectURL(state.homePreviewUrl);
    state.homePreviewUrl = null;
  }

  function renderHome() {
    homeMigrationNote.hidden = state.homeSettingsAvailable;
    homeImageInput.disabled = !state.homeSettingsAvailable;
    homeForm.querySelector('[type="submit"]').disabled = !state.homeSettingsAvailable;
    removeHomeImageButton.disabled = !state.homeSettingsAvailable || !state.home.hero_image_url;
    setHomePreview(state.home.hero_image_url || '');
  }

  function populateCategorySelect(select, includeAll = false) {
    const currentValue = select.value;
    const options = [];
    if (includeAll) {
      const all = element('option', '', 'Todas as categorias');
      all.value = 'all';
      options.push(all);
    }
    state.categories.forEach((category) => {
      const option = element('option', '', category.name);
      option.value = String(category.id);
      options.push(option);
    });
    select.replaceChildren(...options);
    const validValues = options.map((option) => option.value);
    select.value = validValues.includes(currentValue) ? currentValue : (includeAll ? 'all' : validValues[0] || '');
  }

  function renderCategories() {
    const list = document.querySelector('[data-category-list]');
    if (!state.categories.length) {
      list.replaceChildren(emptyNode('Nenhuma categoria cadastrada.'));
      return;
    }

    const rows = state.categories.map((category) => {
      const row = element('div', 'admin-list-row');
      const copy = element('div', 'admin-list-row__copy');
      copy.append(element('strong', '', category.name), element('small', '', category.subtitle || 'Sem subtítulo'));
      const order = element('span', 'admin-order', `Ordem ${category.sort_order}`);
      const actions = element('div', 'admin-row-actions');
      actions.append(
        statusBadge(category.is_active),
        actionButton('Editar', () => openCategoryDialog(category)),
        actionButton('Excluir', () => deleteCategory(category), true),
      );
      row.append(copy, order, actions);
      return row;
    });
    list.replaceChildren(...rows);
  }

  function renderPrices() {
    const list = document.querySelector('[data-price-list]');
    const filter = document.querySelector('[data-price-category-filter]');
    populateCategorySelect(filter, true);
    populateCategorySelect(field(document.querySelector('[data-price-form]'), 'category_id'));

    const selected = filter.value;
    const prices = selected === 'all'
      ? state.prices
      : state.prices.filter((price) => String(price.category_id) === selected);

    if (!prices.length) {
      const row = element('tr');
      const cell = emptyNode('Nenhum serviço cadastrado nesta seleção.', 'td');
      cell.colSpan = 5;
      row.append(cell);
      list.replaceChildren(row);
      return;
    }

    const rows = prices.map((price) => {
      const category = state.categories.find((item) => item.id === price.category_id);
      const row = element('tr');
      const service = element('td');
      service.append(element('strong', '', price.service));
      if (price.note) service.append(element('small', '', price.note));
      row.append(
        service,
        element('td', '', category?.name || 'Categoria removida'),
        element('td', '', currency.format(Number(price.price))),
      );
      const status = element('td');
      status.append(statusBadge(price.is_active));
      const actions = element('td');
      const actionWrap = element('div', 'admin-row-actions');
      actionWrap.append(
        actionButton('Editar', () => openPriceDialog(price)),
        actionButton('Excluir', () => deletePrice(price), true),
      );
      actions.append(actionWrap);
      row.append(status, actions);
      return row;
    });
    list.replaceChildren(...rows);
  }

  function renderModels() {
    const list = document.querySelector('[data-model-list]');
    if (!state.models.length) {
      list.replaceChildren(emptyNode('Nenhum modelo cadastrado.'));
      return;
    }

    const rows = state.models.map((model) => {
      const row = element('article', 'admin-model-row');
      const image = element('img');
      image.src = model.image_url;
      image.alt = `Foto de ${model.title}`;
      const content = element('div', 'admin-model-row__content');
      content.append(element('h3', '', model.title), element('p', '', model.description));
      const meta = element('div', 'admin-model-row__meta');
      meta.append(element('span', '', model.category), statusBadge(model.is_active), element('span', '', `Ordem ${model.sort_order}`));
      const actions = element('div', 'admin-row-actions');
      actions.append(
        actionButton('Editar', () => openModelDialog(model)),
        actionButton('Excluir', () => deleteModel(model), true),
      );
      content.append(meta, actions);
      row.append(image, content);
      return row;
    });
    list.replaceChildren(...rows);
  }

  function renderColors() {
    const list = document.querySelector('[data-color-list]');
    if (!state.colors.length) {
      const row = element('tr');
      const cell = emptyNode('Nenhuma cor cadastrada.', 'td');
      cell.colSpan = 6;
      row.append(cell);
      list.replaceChildren(row);
      return;
    }

    const rows = state.colors.map((color) => {
      const row = element('tr');
      const name = element('td');
      const swatch = element('span', 'admin-table__swatch');
      swatch.style.backgroundColor = color.hex;
      name.append(swatch, document.createTextNode(color.name));
      row.append(
        name,
        element('td', '', color.code),
        element('td', '', color.collection),
        element('td', '', color.finish),
      );
      const status = element('td');
      status.append(statusBadge(color.is_active));
      const actions = element('td');
      const actionWrap = element('div', 'admin-row-actions');
      actionWrap.append(
        actionButton('Editar', () => openColorDialog(color)),
        actionButton('Excluir', () => deleteColor(color), true),
      );
      actions.append(actionWrap);
      row.append(status, actions);
      return row;
    });
    list.replaceChildren(...rows);
  }

  function renderAll() {
    renderHome();
    renderCategories();
    renderPrices();
    renderModels();
    renderColors();
    syncLabel.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  async function loadHomeSettings() {
    const { data: buckets, error: bucketError } = await state.client.storage.listBuckets();
    const available = !bucketError && (buckets || []).some((bucket) => bucket.id === 'site-images');
    if (!available) return { available: false, data: null };

    const result = await state.client.from('home_settings').select('*').eq('id', 'home').maybeSingle();
    return { available: !result.error, data: result.data };
  }

  async function loadData() {
    syncLabel.textContent = 'Atualizando...';
    const [home, colors, models, categories, prices] = await Promise.all([
      loadHomeSettings(),
      state.client.from('gel_colors').select('*').order('sort_order').order('name'),
      state.client.from('nail_models').select('*').order('sort_order').order('title'),
      state.client.from('price_categories').select('*').order('sort_order').order('name'),
      state.client.from('price_items').select('*').order('sort_order').order('service'),
    ]);
    const failed = [colors, models, categories, prices].find((result) => result.error);
    if (failed) throw failed.error;
    state.homeSettingsAvailable = home.available;
    state.home = home.data || { id: 'home', hero_image_url: null, hero_image_path: null };
    state.colors = colors.data || [];
    state.models = models.data || [];
    state.categories = categories.data || [];
    state.prices = prices.data || [];
    renderAll();
  }

  async function verifyAdmin(user) {
    const { data, error } = await state.client
      .from('site_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function openWorkspace(user) {
    try {
      const authorized = await verifyAdmin(user);
      if (!authorized) {
        await state.client.auth.signOut();
        showView('auth');
        setMessage(loginMessage, 'Este usuário não possui permissão administrativa.');
        return;
      }
      state.user = user;
      userLabel.textContent = user.email;
      showView('admin');
      await loadData();
    } catch (error) {
      showView('auth');
      setMessage(loginMessage, `Não foi possível abrir o painel: ${error.message}`);
    }
  }

  async function saveRecord(table, id, payload) {
    const query = id
      ? state.client.from(table).update(payload).eq('id', id)
      : state.client.from(table).insert(payload);
    const { error } = await query;
    if (error) throw error;
  }

  function prepareDialog(form, dialog, record, defaults = {}) {
    form.reset();
    Object.entries(defaults).forEach(([name, value]) => { field(form, name).value = value; });
    field(form, 'id').value = record?.id || '';
    field(form, 'is_active').checked = record ? record.is_active : true;
    dialog.showModal();
  }

  const colorDialog = document.querySelector('[data-color-dialog]');
  const colorForm = document.querySelector('[data-color-form]');
  const colorMessage = document.querySelector('[data-color-form-message]');
  const hexInput = field(colorForm, 'hex');
  const hexPicker = field(colorForm, 'hex_picker');

  function openColorDialog(color = null) {
    prepareDialog(colorForm, colorDialog, color, {
      name: color?.name || '',
      code: color?.code || '',
      hex: color?.hex || '#d9a6a6',
      hex_picker: color?.hex || '#d9a6a6',
      finish: color?.finish || '',
      collection: color?.collection || '',
      sort_order: color?.sort_order ?? nextOrder(state.colors),
    });
    document.querySelector('[data-color-dialog-title]').textContent = color ? 'Editar cor' : 'Nova cor';
    setMessage(colorMessage, '');
  }

  hexPicker.addEventListener('input', () => { hexInput.value = hexPicker.value; });
  hexInput.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) hexPicker.value = hexInput.value;
  });

  colorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setSubmitting(colorForm, true);
    setMessage(colorMessage, '');
    try {
      const id = field(colorForm, 'id').value;
      await saveRecord('gel_colors', id, {
        name: field(colorForm, 'name').value.trim(),
        code: field(colorForm, 'code').value.trim().toUpperCase(),
        hex: hexInput.value.trim(),
        finish: field(colorForm, 'finish').value.trim(),
        collection: field(colorForm, 'collection').value.trim(),
        sort_order: Number(field(colorForm, 'sort_order').value),
        is_active: field(colorForm, 'is_active').checked,
      });
      colorDialog.close();
      await loadData();
      showToast('Cor salva com sucesso.');
    } catch (error) {
      setMessage(colorMessage, `Não foi possível salvar: ${error.message}`);
    } finally {
      setSubmitting(colorForm, false);
    }
  });

  const categoryDialog = document.querySelector('[data-category-dialog]');
  const categoryForm = document.querySelector('[data-category-form]');
  const categoryMessage = document.querySelector('[data-category-form-message]');

  function openCategoryDialog(category = null) {
    prepareDialog(categoryForm, categoryDialog, category, {
      name: category?.name || '',
      subtitle: category?.subtitle || '',
      sort_order: category?.sort_order ?? nextOrder(state.categories),
    });
    document.querySelector('[data-category-dialog-title]').textContent = category ? 'Editar categoria' : 'Nova categoria';
    setMessage(categoryMessage, '');
  }

  categoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setSubmitting(categoryForm, true);
    setMessage(categoryMessage, '');
    try {
      const id = field(categoryForm, 'id').value;
      await saveRecord('price_categories', id, {
        name: field(categoryForm, 'name').value.trim(),
        subtitle: field(categoryForm, 'subtitle').value.trim(),
        sort_order: Number(field(categoryForm, 'sort_order').value),
        is_active: field(categoryForm, 'is_active').checked,
      });
      categoryDialog.close();
      await loadData();
      showToast('Categoria salva com sucesso.');
    } catch (error) {
      setMessage(categoryMessage, `Não foi possível salvar: ${error.message}`);
    } finally {
      setSubmitting(categoryForm, false);
    }
  });

  const priceDialog = document.querySelector('[data-price-dialog]');
  const priceForm = document.querySelector('[data-price-form]');
  const priceMessage = document.querySelector('[data-price-form-message]');

  function openPriceDialog(price = null) {
    if (!state.categories.length) {
      showToast('Cadastre uma categoria antes de adicionar serviços.', true);
      return;
    }
    populateCategorySelect(field(priceForm, 'category_id'));
    prepareDialog(priceForm, priceDialog, price, {
      service: price?.service || '',
      category_id: price?.category_id || state.categories[0].id,
      price: price?.price ?? '',
      note: price?.note || '',
      sort_order: price?.sort_order ?? nextOrder(state.prices),
    });
    field(priceForm, 'category_id').value = String(price?.category_id || state.categories[0].id);
    document.querySelector('[data-price-dialog-title]').textContent = price ? 'Editar serviço' : 'Novo serviço';
    setMessage(priceMessage, '');
  }

  priceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setSubmitting(priceForm, true);
    setMessage(priceMessage, '');
    try {
      const id = field(priceForm, 'id').value;
      await saveRecord('price_items', id, {
        service: field(priceForm, 'service').value.trim(),
        category_id: Number(field(priceForm, 'category_id').value),
        price: Number(field(priceForm, 'price').value),
        note: field(priceForm, 'note').value.trim(),
        sort_order: Number(field(priceForm, 'sort_order').value),
        is_active: field(priceForm, 'is_active').checked,
      });
      priceDialog.close();
      await loadData();
      showToast('Serviço salvo com sucesso.');
    } catch (error) {
      setMessage(priceMessage, `Não foi possível salvar: ${error.message}`);
    } finally {
      setSubmitting(priceForm, false);
    }
  });

  const modelDialog = document.querySelector('[data-model-dialog]');
  const modelForm = document.querySelector('[data-model-form]');
  const modelMessage = document.querySelector('[data-model-form-message]');
  const modelImageInput = field(modelForm, 'image');
  const modelCategorySelect = field(modelForm, 'category');
  const modelNewCategoryField = document.querySelector('[data-model-new-category]');
  const modelNewCategoryInput = field(modelForm, 'new_category');
  const modelPreview = document.querySelector('[data-model-preview]');
  const modelPreviewImage = modelPreview.querySelector('img');

  function modelCategories() {
    const categories = state.models
      .map((model) => model.category.trim())
      .filter(Boolean);
    return [...new Set(categories)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  function toggleNewModelCategory() {
    const creating = modelCategorySelect.value === '__new__';
    modelNewCategoryField.hidden = !creating;
    modelNewCategoryInput.disabled = !creating;
    modelNewCategoryInput.required = creating;
    if (!creating) modelNewCategoryInput.value = '';
  }

  function populateModelCategorySelect(selectedCategory = '') {
    const categories = modelCategories();
    if (selectedCategory && !categories.includes(selectedCategory)) categories.push(selectedCategory);
    categories.sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const options = categories.map((category) => {
      const option = element('option', '', category);
      option.value = category;
      return option;
    });
    const newOption = element('option', '', '+ Nova categoria');
    newOption.value = '__new__';
    modelCategorySelect.replaceChildren(...options, newOption);
    modelCategorySelect.value = selectedCategory || categories[0] || '__new__';
    toggleNewModelCategory();
  }

  function selectedModelCategory() {
    if (modelCategorySelect.value !== '__new__') return modelCategorySelect.value;
    const typedCategory = modelNewCategoryInput.value.trim();
    if (!typedCategory) throw new Error('Informe o nome da nova categoria.');
    return modelCategories().find((category) => category.localeCompare(typedCategory, 'pt-BR', { sensitivity: 'base' }) === 0)
      || typedCategory;
  }

  function setModelPreview(url) {
    modelPreview.hidden = !url;
    if (url) modelPreviewImage.src = url;
  }

  function clearPreviewUrl() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }

  function openModelDialog(model = null) {
    clearPreviewUrl();
    populateModelCategorySelect(model?.category || '');
    prepareDialog(modelForm, modelDialog, model, {
      title: model?.title || '',
      description: model?.description || '',
      current_image_url: model?.image_url || '',
      current_image_path: model?.image_path || '',
      sort_order: model?.sort_order ?? nextOrder(state.models),
    });
    modelCategorySelect.value = model?.category || modelCategories()[0] || '__new__';
    toggleNewModelCategory();
    modelImageInput.value = '';
    setModelPreview(model?.image_url || '');
    document.querySelector('[data-model-dialog-title]').textContent = model ? 'Editar modelo' : 'Novo modelo';
    setMessage(modelMessage, '');
  }

  modelImageInput.addEventListener('change', () => {
    clearPreviewUrl();
    const file = modelImageInput.files[0];
    if (!file) {
      setModelPreview(field(modelForm, 'current_image_url').value);
      return;
    }
    state.previewUrl = URL.createObjectURL(file);
    setModelPreview(state.previewUrl);
  });

  modelCategorySelect.addEventListener('change', toggleNewModelCategory);

  function validateImage(file) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');
  }

  async function uploadImage(bucket, directory, file) {
    validateImage(file);
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const folder = directory ? `${directory}/` : '';
    const path = `${state.user.id}/${folder}${crypto.randomUUID()}.${extensions[file.type]}`;
    const { error } = await state.client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = state.client.storage.from(bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async function uploadModelImage(file) {
    return uploadImage('nail-models', '', file);
  }

  homeImageInput.addEventListener('change', () => {
    clearHomePreviewUrl();
    setMessage(homeMessage, '');
    const file = homeImageInput.files[0];
    if (!file) {
      setHomePreview(state.home.hero_image_url || '');
      return;
    }
    try {
      validateImage(file);
      state.homePreviewUrl = URL.createObjectURL(file);
      setHomePreview(state.homePreviewUrl);
    } catch (error) {
      homeImageInput.value = '';
      setHomePreview(state.home.hero_image_url || '');
      setMessage(homeMessage, error.message);
    }
  });

  homeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = homeImageInput.files[0];
    if (!file) {
      setMessage(homeMessage, 'Selecione uma nova foto antes de salvar.');
      return;
    }

    setSubmitting(homeForm, true);
    setMessage(homeMessage, '');
    let uploaded = null;
    try {
      uploaded = await uploadImage('site-images', 'home', file);
      const previousPath = state.home.hero_image_path;
      const { error } = await state.client.from('home_settings').upsert({
        id: 'home',
        hero_image_url: uploaded.url,
        hero_image_path: uploaded.path,
      }, { onConflict: 'id' });
      if (error) throw error;

      if (previousPath) await state.client.storage.from('site-images').remove([previousPath]);
      clearHomePreviewUrl();
      homeImageInput.value = '';
      await loadData();
      showToast('Imagem da página inicial atualizada.');
    } catch (error) {
      if (uploaded?.path) await state.client.storage.from('site-images').remove([uploaded.path]);
      setMessage(homeMessage, `Não foi possível salvar: ${error.message}`);
    } finally {
      setSubmitting(homeForm, false);
    }
  });

  removeHomeImageButton.addEventListener('click', async () => {
    if (!state.home.hero_image_url || !window.confirm('Remover a foto e voltar para a ilustração padrão?')) return;
    removeHomeImageButton.disabled = true;
    setMessage(homeMessage, '');
    try {
      const previousPath = state.home.hero_image_path;
      const { error } = await state.client.from('home_settings').upsert({
        id: 'home',
        hero_image_url: null,
        hero_image_path: null,
      }, { onConflict: 'id' });
      if (error) throw error;

      if (previousPath) await state.client.storage.from('site-images').remove([previousPath]);
      clearHomePreviewUrl();
      homeImageInput.value = '';
      await loadData();
      showToast('Ilustração padrão restaurada.');
    } catch (error) {
      setMessage(homeMessage, `Não foi possível remover: ${error.message}`);
      removeHomeImageButton.disabled = false;
    }
  });

  modelForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setSubmitting(modelForm, true);
    setMessage(modelMessage, '');
    let uploaded = null;
    try {
      const id = field(modelForm, 'id').value;
      const file = modelImageInput.files[0];
      const currentUrl = field(modelForm, 'current_image_url').value;
      const currentPath = field(modelForm, 'current_image_path').value;
      if (!file && !currentUrl) throw new Error('Selecione uma foto para o modelo.');
      if (file) uploaded = await uploadModelImage(file);

      await saveRecord('nail_models', id, {
        title: field(modelForm, 'title').value.trim(),
        category: selectedModelCategory(),
        description: field(modelForm, 'description').value.trim(),
        image_url: uploaded?.url || currentUrl,
        image_path: uploaded?.path || currentPath || null,
        sort_order: Number(field(modelForm, 'sort_order').value),
        is_active: field(modelForm, 'is_active').checked,
      });

      if (uploaded && currentPath) {
        await state.client.storage.from('nail-models').remove([currentPath]);
      }
      modelDialog.close();
      clearPreviewUrl();
      await loadData();
      showToast('Modelo salvo com sucesso.');
    } catch (error) {
      if (uploaded?.path) await state.client.storage.from('nail-models').remove([uploaded.path]);
      setMessage(modelMessage, `Não foi possível salvar: ${error.message}`);
    } finally {
      setSubmitting(modelForm, false);
    }
  });

  async function deleteRecord(table, id) {
    const { error } = await state.client.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async function deleteColor(color) {
    if (!window.confirm(`Excluir a cor “${color.name}”?`)) return;
    try {
      await deleteRecord('gel_colors', color.id);
      await loadData();
      showToast('Cor excluída.');
    } catch (error) {
      showToast(`Não foi possível excluir: ${error.message}`, true);
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Excluir a categoria “${category.name}” e todos os serviços dela?`)) return;
    try {
      await deleteRecord('price_categories', category.id);
      await loadData();
      showToast('Categoria excluída.');
    } catch (error) {
      showToast(`Não foi possível excluir: ${error.message}`, true);
    }
  }

  async function deletePrice(price) {
    if (!window.confirm(`Excluir o serviço “${price.service}”?`)) return;
    try {
      await deleteRecord('price_items', price.id);
      await loadData();
      showToast('Serviço excluído.');
    } catch (error) {
      showToast(`Não foi possível excluir: ${error.message}`, true);
    }
  }

  async function deleteModel(model) {
    if (!window.confirm(`Excluir o modelo “${model.title}”?`)) return;
    try {
      await deleteRecord('nail_models', model.id);
      if (model.image_path) await state.client.storage.from('nail-models').remove([model.image_path]);
      await loadData();
      showToast('Modelo excluído.');
    } catch (error) {
      showToast(`Não foi possível excluir: ${error.message}`, true);
    }
  }

  document.querySelectorAll('[data-admin-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-admin-tab]').forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
        const active = panel.dataset.adminPanel === tab.dataset.adminTab;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    });
  });

  document.querySelector('[data-price-category-filter]').addEventListener('change', renderPrices);
  document.querySelector('[data-add-color]').addEventListener('click', () => openColorDialog());
  document.querySelector('[data-add-model]').addEventListener('click', () => openModelDialog());
  document.querySelector('[data-add-category]').addEventListener('click', () => openCategoryDialog());
  document.querySelector('[data-add-price]').addEventListener('click', () => openPriceDialog());
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      clearPreviewUrl();
      button.closest('dialog').close();
    });
  });

  document.querySelectorAll('.admin-dialog [type="submit"]').forEach((button) => {
    button.dataset.label = button.textContent;
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Entrando...';
    setMessage(loginMessage, '');
    try {
      const { data, error } = await state.client.auth.signInWithPassword({
        email: field(loginForm, 'email').value.trim(),
        password: field(loginForm, 'password').value,
      });
      if (error) throw error;
      await openWorkspace(data.user);
    } catch (error) {
      setMessage(loginMessage, `Não foi possível entrar: ${error.message}`);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Entrar';
    }
  });

  logoutButton.addEventListener('click', async () => {
    await state.client.auth.signOut();
    state.user = null;
    loginForm.reset();
    setMessage(loginMessage, '');
    showView('auth');
  });

  async function start() {
    if (!window.GesieleSupabase?.isConfigured()) {
      showView('config');
      return;
    }
    state.client = window.GesieleSupabase.getClient();
    const { data, error } = await state.client.auth.getSession();
    if (error) {
      showView('auth');
      setMessage(loginMessage, `Não foi possível verificar a sessão: ${error.message}`);
      return;
    }
    if (data.session?.user) await openWorkspace(data.session.user);
    else showView('auth');
  }

  start();
}());
