const body = document.body;
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('[data-sidebar-open]');
const closeButtons = document.querySelectorAll('[data-sidebar-close]');

function openSidebar() {
  body.classList.add('sidebar-open');
  menuButton?.setAttribute('aria-expanded', 'true');
  sidebar?.querySelector('a, button')?.focus();
}
function closeSidebar() {
  body.classList.remove('sidebar-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}
menuButton?.addEventListener('click', openSidebar);
closeButtons.forEach((button) => button.addEventListener('click', closeSidebar));
document.addEventListener('keydown', (event) => event.key === 'Escape' && closeSidebar());

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const searchInput = document.querySelector('[data-color-search]');
const collectionFilter = document.querySelector('[data-color-filter]');
const emptyState = document.querySelector('[data-color-empty]');

function filterColors() {
  const query = (searchInput?.value || '').trim().toLowerCase();
  const collection = collectionFilter?.value || 'all';
  let visible = 0;
  const colorCards = [...document.querySelectorAll('[data-color-card]')];
  colorCards.forEach((card) => {
    const matchesText = card.dataset.search.toLowerCase().includes(query);
    const matchesCollection = collection === 'all' || card.dataset.collection === collection;
    const show = matchesText && matchesCollection;
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (emptyState) emptyState.hidden = visible !== 0;
}
searchInput?.addEventListener('input', filterColors);
collectionFilter?.addEventListener('change', filterColors);

const modelFilterContainer = document.querySelector('[data-model-filters]');
modelFilterContainer?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-model-filter]');
  if (button) {
    const modelFilters = document.querySelectorAll('[data-model-filter]');
    const modelCards = document.querySelectorAll('[data-model-card]');
    modelFilters.forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    const category = button.dataset.modelFilter;
    modelCards.forEach((card) => {
      card.hidden = category !== 'all' && card.dataset.category !== category;
    });
  }
});

document.addEventListener('catalog:updated', (event) => {
  if (event.detail?.type === 'colors') filterColors();
});

window.addEventListener('resize', () => { if (window.innerWidth > 860) closeSidebar(); });
