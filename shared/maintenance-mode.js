(function () {
  const config = window.HUB_MAINTENANCE || {};
  if (!config.enabled) {
    return;
  }

  const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (currentFile === 'maintenance.html') {
    return;
  }

  const script = document.currentScript;
  const configuredPath = script && script.dataset ? script.dataset.maintenancePath : './maintenance.html';
  const targetUrl = new URL(configuredPath || './maintenance.html', window.location.href);
  const sourcePath = window.location.pathname + window.location.search + window.location.hash;

  targetUrl.searchParams.set('from', sourcePath);
  window.location.replace(targetUrl.toString());
})();
