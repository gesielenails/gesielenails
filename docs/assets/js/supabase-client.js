(function initializeSupabaseClient() {
  let client = null;

  function isConfigured() {
    const config = window.GESIELE_SUPABASE_CONFIG;
    return Boolean(
      config
      && /^https:\/\/.+\.supabase\.co$/i.test(config.url || '')
      && typeof config.publishableKey === 'string'
      && config.publishableKey.length > 20
    );
  }

  function getClient() {
    if (!isConfigured() || !window.supabase?.createClient) return null;

    if (!client) {
      const config = window.GESIELE_SUPABASE_CONFIG;
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }

    return client;
  }

  window.GesieleSupabase = Object.freeze({ isConfigured, getClient });
}());
