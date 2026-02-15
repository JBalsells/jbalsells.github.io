// AOS Animations
AOS.init({
  anchorPlacement: 'top-left',
  duration: 1000
});

// Collapsible sections - single handler using data attributes
document.querySelectorAll('.section-toggle').forEach(function (toggle) {
  toggle.addEventListener('click', function () {
    var targetId = this.getAttribute('data-target');
    var content = document.getElementById(targetId);
    var icon = this.querySelector('.toggle-icon');

    content.classList.toggle('open');
    icon.classList.toggle('open');
  });
});

// Swiper carousel
var swiper = new Swiper('.swiper-container', {
  slidesPerView: 1,
  spaceBetween: 10,
  loop: true,
  autoplay: {
    delay: 3000,
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  effect: 'slide',
});
