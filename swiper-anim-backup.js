document.addEventListener("DOMContentLoaded", function () {
  const homeComponentEl = document.querySelector("[swiper-home]");
  if (!homeComponentEl) return;

  const homeSwiperEl = homeComponentEl.querySelector(".swiper.is-home");
  if (!homeSwiperEl) return;

  const homePaginationEl =
    homeComponentEl.querySelector(".swiper-pagination.is-home") ||
    homeComponentEl.querySelector(".swiper-pagination");
  const homeNextEl =
    homeComponentEl.querySelector(".swiper-button-next.is-home") ||
    homeComponentEl.querySelector(".swiper-button-next");
  const homePrevEl =
    homeComponentEl.querySelector(".swiper-button-prev.is-home") ||
    homeComponentEl.querySelector(".swiper-button-prev");
  const homeScrollbarEl =
    homeComponentEl.querySelector(".swiper-scrollbar.is-home") ||
    homeComponentEl.querySelector(".swiper-scrollbar");

  new Swiper(homeSwiperEl, {
    // Optional parameters

    loop: true,

    // If we need pagination
    ...(homePaginationEl
      ? {
          pagination: {
            el: homePaginationEl,
            clickable: true,
            bulletClass: "home-swiper-bullet",
            bulletActiveClass: "home-swiper-bullet-active",
          },
        }
      : {}),
    autoplay: {
      delay: 2000,
      disableOnInteraction: false,
    },
    speed: 1000,
    spaceBetween: 16,
    ...(homeNextEl && homePrevEl
      ? {
          navigation: {
            nextEl: homeNextEl,
            prevEl: homePrevEl,
          },
        }
      : {}),
    ...(homeScrollbarEl
      ? {
          scrollbar: {
            el: homeScrollbarEl,
            draggable: true,
          },
        }
      : {}),
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const careersComponentEl = document.querySelector("[swiper-careers]");
  if (!careersComponentEl) return;

  const careersSwiperEl = careersComponentEl.querySelector(
    ".swiper.is-careers"
  );
  if (!careersSwiperEl) return;

  const careersPaginationEl =
    careersComponentEl.querySelector(".swiper-pagination.is-careers") ||
    careersComponentEl.querySelector(".swiper-pagination");
  const careersNextEl =
    careersComponentEl.querySelector(".swiper-button-next.is-careers") ||
    careersComponentEl.querySelector(".swiper-button-next");
  const careersPrevEl =
    careersComponentEl.querySelector(".swiper-button-prev.is-careers") ||
    careersComponentEl.querySelector(".swiper-button-prev");
  const careersScrollbarEl =
    careersComponentEl.querySelector(".swiper-scrollbar.is-careers") ||
    careersComponentEl.querySelector(".swiper-scrollbar");

  new Swiper(careersSwiperEl, {
    // Optional parameters

    loop: true,
    slidesPerView: 1.15,
    // If we need pagination
    ...(careersPaginationEl
      ? {
          pagination: {
            el: careersPaginationEl,
            clickable: true,
            bulletClass: "careers-swiper-bullet",
            bulletActiveClass: "careers-swiper-bullet-active",
          },
        }
      : {}),
    autoplay: {
      delay: 2000,
      disableOnInteraction: false,
    },
    speed: 1000,
    spaceBetween: 16,
    ...(careersNextEl && careersPrevEl
      ? {
          navigation: {
            nextEl: careersNextEl,
            prevEl: careersPrevEl,
          },
        }
      : {}),
    ...(careersScrollbarEl
      ? {
          scrollbar: {
            el: careersScrollbarEl,
            draggable: true,
          },
        }
      : {}),
  });
});