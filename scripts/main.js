// Splash screen — fade out when page is fully loaded
(function () {
  var splash = document.getElementById('splashScreen');
  if (!splash) return;

  // Prevent scroll while splash is visible
  document.body.style.overflow = 'hidden';

  function hideSplash() {
    splash.classList.add('fade-out');
    document.body.style.overflow = '';
    splash.addEventListener('transitionend', function () {
      splash.remove();
    });
  }

  window.addEventListener('load', function () {
    // Small delay so the transition feels intentional, not abrupt
    setTimeout(hideSplash, 1000);
  });

  // Safety fallback: hide after 5s even if load event is slow
  setTimeout(hideSplash, 5000);
})();

// Add AOS attributes dynamically to elements NOT inside collapsible sections
(function () {
  function isInsideCollapsible(el) {
    return !!el.closest('.collapsible-content');
  }

  // Skill categories (not collapsible)
  document.querySelectorAll('.skill-category').forEach(function (cat, i) {
    if (!isInsideCollapsible(cat)) {
      cat.setAttribute('data-aos', 'fade-up');
      cat.setAttribute('data-aos-delay', String(i * 100));
    }
  });

  // Section headings (safe — they're outside the collapsible div)
  document.querySelectorAll('.section-heading').forEach(function (h) {
    if (!h.hasAttribute('data-aos')) {
      h.setAttribute('data-aos', 'fade-right');
    }
  });

  // Contact form (not collapsible)
  var contactForm = document.querySelector('.contant-section .row');
  if (contactForm) contactForm.setAttribute('data-aos', 'fade-up');
})();

// AOS Animations — reduced duration, animate once
AOS.init({
  anchorPlacement: 'top-left',
  duration: 600,
  once: true
});

// PureCounter auto-initializes on load (v1.1.4 IIFE) — no manual call needed.
// It picks up .purecounter elements and their data-purecounter-* attributes automatically.

// Typed.js — animated hero tagline
if (document.getElementById('typed-output')) {
  new Typed('#typed-output', {
    strings: [
      '10+ years in firmware & software development.',
      '4+ years in Machine Learning Operations.',
      'Bridging hardware and software to build data-driven systems.'
    ],
    typeSpeed: 40,
    backSpeed: 25,
    backDelay: 2000,
    startDelay: 500,
    loop: true,
    showCursor: true
  });
}

// Footer year
(function () {
  var el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Scroll progress bar
(function () {
  var bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', function () {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }, { passive: true });
})();

// Collapsible sections — manual toggle
document.querySelectorAll('.section-toggle').forEach(function (toggle) {
  toggle.addEventListener('click', function () {
    var targetId = this.getAttribute('data-target');
    var content = document.getElementById(targetId);
    var icon = this.querySelector('.toggle-icon');

    content.classList.toggle('open');
    icon.classList.toggle('open');

    // Apply stagger when opening manually
    if (content.classList.contains('open')) {
      applyStagger(content);
    }
  });
});

// Stagger delay for children inside a collapsible section
function applyStagger(content) {
  var cards = content.querySelectorAll('.timeline-card');
  cards.forEach(function (card, i) {
    card.style.transitionDelay = (i * 80) + 'ms';
  });
  var galleryEls = content.querySelectorAll('.gallery-category-label, .thumbnail-gallery');
  galleryEls.forEach(function (el, i) {
    el.style.transitionDelay = (i * 100) + 'ms';
  });
}

// Auto-open collapsible sections on scroll (lazy reveal)
(function () {
  if (!('IntersectionObserver' in window)) {
    // Fallback: open all immediately
    document.querySelectorAll('.collapsible-content').forEach(function (c) {
      c.classList.add('open');
      var icon = document.querySelector('[data-target="' + c.id + '"] .toggle-icon');
      if (icon) icon.classList.add('open');
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var content = entry.target;
        if (!content.classList.contains('open')) {
          applyStagger(content);
          content.classList.add('open');
          var icon = document.querySelector('[data-target="' + content.id + '"] .toggle-icon');
          if (icon) icon.classList.add('open');
        }
        observer.unobserve(content);
      }
    });
  }, {
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.05
  });

  document.querySelectorAll('.collapsible-content').forEach(function (content) {
    observer.observe(content);
  });
})();

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

// Back to top button
(function () {
  var btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Dark mode toggle
(function () {
  var saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleDarkMode() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateIcons(next);
  }

  function updateIcons(theme) {
    document.querySelectorAll('.nav-dark-toggle i').forEach(function (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
  }

  // Initialize icons
  updateIcons(saved || 'light');

  // Attach to both toggle buttons (mobile + desktop)
  document.querySelectorAll('.nav-dark-toggle').forEach(function (btn) {
    btn.addEventListener('click', toggleDarkMode);
  });
})();

// Close mobile nav when clicking a link
(function () {
  var navCollapse = document.getElementById('navbarMain');
  if (!navCollapse) return;
  navCollapse.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      var bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
      if (bsCollapse) bsCollapse.hide();
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
