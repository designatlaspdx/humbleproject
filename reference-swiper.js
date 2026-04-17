document.addEventListener("DOMContentLoaded", () => {
  const slideComponents = document.querySelectorAll("[data-slide-component]");

  slideComponents.forEach((componentEl) => {
    const quotesSliderEl = componentEl.querySelector("[data-slider-quotes]");
    const clientsSliderEl = componentEl.querySelector("[data-slider-clients]");
    const paginationEl = componentEl.querySelector(".swiper-custom-pagination");

    let quotesSwiper, clientsSwiper;

    if (quotesSliderEl) {
      quotesSwiper = new Swiper(quotesSliderEl, {
        loop: true,
        effect: "fade",
        speed: 400,
        slidesPerView: 1,
        allowTouchMove: true,
        simulateTouch: true,
        fadeEffect: {
          crossFade: true,
        },
        pagination: paginationEl ? {
          el: paginationEl,
          clickable: true,
          bulletClass: "swiper-custom-bullet",
          bulletActiveClass: "swiper-custom-bullet-active",
        } : undefined
      });
    }

    if (clientsSliderEl) {
      clientsSwiper = new Swiper(clientsSliderEl, {
        loop: true,
        effect: "fade",
        speed: 400,
        slidesPerView: 1,
        allowTouchMove: true,
        simulateTouch: true,
        fadeEffect: {
          crossFade: true,
        }
      });
    }

    // Sync sliders using controller
    if (quotesSwiper && clientsSwiper) {
      quotesSwiper.controller.control = clientsSwiper;
      clientsSwiper.controller.control = quotesSwiper;
    }
  });
});