// AOS Animations — reduced duration, animate once
AOS.init({
  anchorPlacement: 'top-left',
  duration: 600,
  once: true
});

// Collapsible sections (Projects & Volunteer only)
document.querySelectorAll('.section-toggle').forEach(function (toggle) {
  toggle.addEventListener('click', function () {
    var targetId = this.getAttribute('data-target');
    var content = document.getElementById(targetId);
    var icon = this.querySelector('.toggle-icon');

    content.classList.toggle('open');
    icon.classList.toggle('open');
  });
});

// Smooth scroll with offset for sticky nav
(function () {
  var navHeight = document.querySelector('.sticky-nav')
    ? document.querySelector('.sticky-nav').offsetHeight
    : 56;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
})();

// Active nav link highlighting on scroll
(function () {
  var navLinks = document.querySelectorAll('.sticky-nav .nav-link');
  var sections = [];

  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.startsWith('#') && href !== '#top') {
      var section = document.querySelector(href);
      if (section) {
        sections.push({ el: section, link: link });
      }
    }
  });

  function setActive() {
    var scrollPos = window.scrollY + 100;
    var current = null;

    sections.forEach(function (item) {
      if (item.el.offsetTop <= scrollPos) {
        current = item;
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove('active');
    });

    if (current) {
      current.link.classList.add('active');
    }
  }

  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
})();
