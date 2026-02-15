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

// Lightbox gallery
(function () {
  var overlay  = document.getElementById('lightbox');
  if (!overlay) return;

  var lbImg     = document.getElementById('lightbox-img');
  var lbCaption = document.getElementById('lightbox-caption');
  var lbCounter = document.getElementById('lightbox-counter');
  var items     = Array.from(document.querySelectorAll('.gallery-item'));
  var current   = 0;

  function show(index) {
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    current = index;

    var item = items[current];
    var img  = item.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = item.getAttribute('data-caption') || '';
    lbCounter.textContent = (current + 1) + ' / ' + items.length;
  }

  function open(index) {
    show(index);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Click on thumbnails
  items.forEach(function (item, i) {
    item.addEventListener('click', function () { open(i); });
  });

  // Controls
  overlay.querySelector('.lightbox-close').addEventListener('click', close);
  overlay.querySelector('.lightbox-prev').addEventListener('click', function (e) {
    e.stopPropagation();
    show(current - 1);
  });
  overlay.querySelector('.lightbox-next').addEventListener('click', function (e) {
    e.stopPropagation();
    show(current + 1);
  });

  // Close on backdrop click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // Swipe support for mobile
  var touchStartX = 0;
  overlay.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  overlay.addEventListener('touchend', function (e) {
    var diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) show(current - 1);
      else show(current + 1);
    }
  }, { passive: true });
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
