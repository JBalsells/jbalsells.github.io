/* ══════════════════════════════════════════════════════════════════════
   Rope Simulations — chrome de página (navbar + cover + footer)
   Inyecta el marco del sitio en #rs-app y deja un <div id="sim-content">
   (clase .sim-content, tema terminal verde) donde cada sim monta su UI.
   Uso:  RS.shell({ title:'…', icon:'fas fa-…' });  → devuelve el elemento.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var NAV_LINKS = [
    ['../index.html#about', 'About'], ['../index.html#skills', 'Skills'],
    ['../index.html#experience', 'Experience'], ['../index.html#education', 'Education'],
    ['../index.html#certs', 'Courses'], ['../index.html#projects', 'Projects'],
    ['../index.html#volunteer', 'Volunteering'], ['../gallery.html', 'Gallery']
  ];

  function navbar() {
    var items = NAV_LINKS.map(function (l) {
      return '<li class="nav-item"><a class="nav-link" href="' + l[0] + '">' + l[1] + '</a></li>';
    }).join('');
    return '' +
      '<nav class="navbar navbar-expand-lg navbar-dark sticky-nav d-print-none" aria-label="Main navigation">' +
      '<div class="container">' +
      '<a class="navbar-brand" href="../index.html">Jorge A. Balsells Orellana</a>' +
      '<div class="d-flex align-items-center ms-auto d-lg-none">' +
      '<button class="btn btn-link nav-dark-toggle me-2" id="darkToggleMobile" aria-label="Toggle dark mode"><i class="fas fa-moon"></i></button>' +
      '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain" aria-controls="navbarMain" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>' +
      '</div>' +
      '<div class="collapse navbar-collapse" id="navbarMain"><ul class="navbar-nav ms-auto">' + items +
      '<li class="nav-item dropdown"><a class="nav-link dropdown-toggle active" href="#" id="othersDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">Others</a>' +
      '<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="othersDropdown"><li><a class="dropdown-item" href="../rope_simulations.html">Rope Simulations</a></li></ul></li>' +
      '<li class="nav-item nav-contact-pill"><a class="nav-link" href="../index.html#contact"><i class="fas fa-envelope me-1"></i>Contact</a></li>' +
      '<li class="nav-item d-none d-lg-block"><button class="btn btn-link nav-dark-toggle" id="darkToggleDesktop" aria-label="Toggle dark mode"><i class="fas fa-moon"></i></button></li>' +
      '</ul></div></div></nav>';
  }

  function footer() {
    return '' +
      '<footer class="site-footer d-print-none"><div class="container text-center">' +
      '<div class="footer-social mb-2">' +
      '<a href="https://www.linkedin.com/in/jbalsells/" title="LinkedIn" target="_blank" rel="noopener" aria-label="LinkedIn profile"><i class="fab fa-linkedin"></i></a>' +
      '<a href="https://github.com/JBalsellsO" title="Github (personal)" target="_blank" rel="noopener" aria-label="GitHub personal account"><i class="fab fa-github"></i></a>' +
      '<a href="https://github.com/JBalsells" title="Github (org)" target="_blank" rel="noopener" aria-label="GitHub organization account"><i class="fab fa-github"></i></a>' +
      '</div><p>&copy; <span id="footer-year"></span> Jorge A. Balsells Orellana. All rights reserved.</p>' +
      '</div></footer>' +
      '<button class="back-to-top d-print-none" id="backToTop" aria-label="Back to top"><i class="fas fa-chevron-up"></i></button>';
  }

  function shell(opts) {
    opts = opts || {};
    var app = document.getElementById('rs-app');
    if (!app) { app = document.createElement('div'); app.id = 'rs-app'; document.body.appendChild(app); }
    app.innerHTML =
      navbar() +
      '<div class="page-content"><div class="container"><div class="cover shadow-sm">' +
      '<div class="px-3 px-lg-4 py-4">' +
      '<a href="../rope_simulations.html" class="btn-back"><i class="fas fa-chevron-left btn-back-arrow"></i> Rope Simulations</a>' +
      '<h2 class="section-heading"><i class="' + (opts.icon || 'fas fa-ruler-combined') + '"></i>' + (opts.title || 'Simulación') + '</h2>' +
      '<div class="sim-content" id="sim-content"></div>' +
      '</div></div></div></div>' +
      footer();
    if (global.RS && RS.footerYear) RS.footerYear();
    return document.getElementById('sim-content');
  }

  global.RS = global.RS || {};
  global.RS.shell = shell;

})(window);
