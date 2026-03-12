(function () {
  const defaults = {
    enabled: true,
    appName: 'Hub de Etiquetas',
    badge: 'Sistema indisponivel',
    title: 'Aplicacao temporariamente desabilitada',
    message: 'O acesso ao sistema esta temporariamente indisponivel.',
    details: 'Tente novamente mais tarde.',
    supportLabel: 'Falar com o suporte',
    supportHref: 'https://wa.me/5562981020272',
    footerNote: 'Pague Menos • Hub de Etiquetas'
  };

  const config = Object.assign({}, defaults, window.HUB_MAINTENANCE || {});
  const from = new URLSearchParams(window.location.search).get('from');

  document.title = config.appName + ' • Manutencao';

  const mappings = [
    ['maintenance-app-name', config.appName],
    ['maintenance-badge', config.enabled ? config.badge : 'Sistema disponivel'],
    ['maintenance-title', config.enabled ? config.title : 'Aplicacao liberada novamente'],
    ['maintenance-message', config.enabled ? config.message : 'O modo de manutencao esta desligado.'],
    ['maintenance-details', config.enabled ? config.details : 'Voce ja pode voltar ao Hub de Etiquetas.'],
    ['maintenance-support-label', config.supportLabel],
    ['maintenance-footer-note', config.footerNote]
  ];

  mappings.forEach(function (entry) {
    const element = document.getElementById(entry[0]);
    if (element) {
      element.textContent = entry[1];
    }
  });

  const supportLink = document.getElementById('maintenance-support-link');
  if (supportLink) {
    supportLink.href = config.supportHref;
  }

  const routeBox = document.getElementById('maintenance-origin');
  const routeValue = document.getElementById('maintenance-origin-value');
  if (routeBox && routeValue && from) {
    routeValue.textContent = from;
    routeBox.hidden = false;
  }

  const backLink = document.getElementById('maintenance-back-link');
  if (backLink) {
    if (config.enabled) {
      backLink.hidden = true;
    } else {
      backLink.hidden = false;
      backLink.href = './index.html';
    }
  }
})();
