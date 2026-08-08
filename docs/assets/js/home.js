(function initializeHomeHero() {
  const image = document.querySelector('[data-home-hero-image]');
  const fallback = document.querySelector('[data-home-hero-fallback]');
  if (!image || !fallback || !window.GesieleSupabase?.isConfigured()) return;

  function showFallback() {
    image.hidden = true;
    image.removeAttribute('src');
    fallback.hidden = false;
  }

  async function loadHeroImage() {
    try {
      const client = window.GesieleSupabase.getClient();
      const { data: buckets, error: bucketError } = await client.storage.listBuckets();
      const featureAvailable = !bucketError && (buckets || []).some((bucket) => bucket.id === 'site-images');
      if (!featureAvailable) return;

      const { data, error } = await client
        .from('home_settings')
        .select('hero_image_url')
        .eq('id', 'home')
        .maybeSingle();

      if (error || !data?.hero_image_url) return;
      image.addEventListener('load', () => {
        fallback.hidden = true;
        image.hidden = false;
      }, { once: true });
      image.addEventListener('error', showFallback, { once: true });
      image.src = data.hero_image_url;
    } catch (_error) {
      showFallback();
    }
  }

  loadHeroImage();
}());
