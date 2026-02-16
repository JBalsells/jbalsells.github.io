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
  var contactForm = document.querySelector('.contact-section .row');
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

// Scroll progress bar + navbar solidify on scroll
(function () {
  var bar = document.getElementById('scrollProgress');
  var nav = document.querySelector('.sticky-nav');

  window.addEventListener('scroll', function () {
    var scrollTop = window.scrollY;

    // Progress bar
    if (bar) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    }

    // Navbar: transparent → solid after 50px scroll
    if (nav) {
      if (scrollTop > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
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

// Open all collapsible sections immediately on load
(function () {
  document.querySelectorAll('.collapsible-content').forEach(function (c) {
    c.classList.add('open');
    var icon = document.querySelector('[data-target="' + c.id + '"] .toggle-icon');
    if (icon) icon.classList.add('open');
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

// Gallery category filters
(function () {
  var filters = document.querySelectorAll('.gallery-filter');
  if (!filters.length) return;

  var labels = document.querySelectorAll('.gallery-category-label[data-category]');
  var galleries = document.querySelectorAll('.thumbnail-gallery[data-category]');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // Update active button
      filters.forEach(function (f) { f.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.getAttribute('data-filter');

      labels.forEach(function (label) {
        if (filter === 'all' || label.getAttribute('data-category') === filter) {
          label.classList.remove('gallery-hidden');
        } else {
          label.classList.add('gallery-hidden');
        }
      });

      galleries.forEach(function (gallery) {
        if (filter === 'all' || gallery.getAttribute('data-category') === filter) {
          gallery.classList.remove('gallery-hidden');
        } else {
          gallery.classList.add('gallery-hidden');
        }
      });
    });
  });
})();

// Gallery blur-up loading
(function () {
  var imgs = document.querySelectorAll('.gallery-item img');

  function markLoaded(img) {
    img.classList.add('loaded');
  }

  imgs.forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img);
    } else {
      img.addEventListener('load', function () { markLoaded(img); });
      img.addEventListener('error', function () { markLoaded(img); });
    }
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
    // Start in animating state (small + transparent)
    overlay.classList.add('animating');
    overlay.classList.add('active');
    show(index);
    document.body.style.overflow = 'hidden';

    // Trigger reflow, then remove animating to start transition
    void lbImg.offsetWidth;
    overlay.classList.remove('animating');
  }

  function close() {
    overlay.classList.add('animating');
    setTimeout(function () {
      overlay.classList.remove('active');
      overlay.classList.remove('animating');
      document.body.style.overflow = '';
    }, 350);
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

// Active nav link + dot navigation highlighting on scroll
(function () {
  var navLinks = document.querySelectorAll('.sticky-nav .nav-link');
  var dotNav = document.getElementById('dotNav');
  var dotLinks = dotNav ? dotNav.querySelectorAll('a') : [];
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

    // Navbar active link
    navLinks.forEach(function (link) {
      link.classList.remove('active');
    });

    if (current) {
      current.link.classList.add('active');
    }

    // Dot nav active dot
    if (dotNav) {
      var currentId = current ? current.el.id : '';
      dotLinks.forEach(function (dot) {
        if (dot.getAttribute('data-section') === currentId) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      // Show dot nav only after scrolling past the hero
      if (window.scrollY > 300) {
        dotNav.classList.add('visible');
      } else {
        dotNav.classList.remove('visible');
      }
    }
  }

  // Dot nav click — smooth scroll
  if (dotNav) {
    var navHeight = document.querySelector('.sticky-nav')
      ? document.querySelector('.sticky-nav').offsetHeight : 56;

    dotLinks.forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
})();
