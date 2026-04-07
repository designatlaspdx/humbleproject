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

  if (homeSwiperEl.swiper) homeSwiperEl.swiper.destroy(true, true);

  new Swiper(homeSwiperEl, {
    // Optional parameters

    loop: true,
    slidesPerView: 1,
    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },

    // If we need pagination
    ...(homePaginationEl
      ? {
          pagination: {
            el: homePaginationEl,
            clickable: true,
            bulletClass: "swiper-pagination-bullet",
            bulletActiveClass: "swiper-pagination-bullet-active",
          },
        }
      : {}),
    speed: 450,
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

  if (careersSwiperEl.swiper) careersSwiperEl.swiper.destroy(true, true);

  new Swiper(careersSwiperEl, {
    // Optional parameters

    loop: true,
    slidesPerView: 1,
    breakpoints: {
      480: {
        slidesPerView: 2,
      },
      992: {
        slidesPerView: 1.15,
      },
    },
    // If we need pagination
    ...(careersPaginationEl
      ? {
          pagination: {
            el: careersPaginationEl,
            clickable: true,
            bulletClass: "swiper-pagination-bullet",
            bulletActiveClass: "swiper-pagination-bullet-active",
          },
        }
      : {}),
    speed: 450,
    spaceBetween: 20,
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

document.addEventListener("DOMContentLoaded", function () {
  const homeStatsComponentEl = document.querySelector("[swiper-home-stats]");
  if (!homeStatsComponentEl) return;

  const homeStatsSwiperEl = homeStatsComponentEl.querySelector(
    ".swiper.is-home-stats"
  );
  if (!homeStatsSwiperEl) return;

  const homeStatsPaginationEl =
    homeStatsComponentEl.querySelector(".swiper-pagination.custom") ||
    homeStatsComponentEl.querySelector(".swiper-pagination");
  const homeStatsNextEl =
    homeStatsComponentEl.querySelector(".swiper-button-next.custom") ||
    homeStatsComponentEl.querySelector(".swiper-button-next");
  const homeStatsPrevEl =
    homeStatsComponentEl.querySelector(".swiper-button-prev.custom") ||
    homeStatsComponentEl.querySelector(".swiper-button-prev");
  const homeStatsScrollbarEl =
    homeStatsComponentEl.querySelector(".swiper-scrollbar.custom") ||
    homeStatsComponentEl.querySelector(".swiper-scrollbar");

  const emitHomeStatsSwiperChange = (swiper, eventName) => {
    if (!swiper) return;
    console.log(
      "[home-stats-swiper] emit",
      eventName,
      "activeIndex=",
      swiper.activeIndex,
      "realIndex=",
      swiper.realIndex
    );
    window.dispatchEvent(
      new CustomEvent("homeStatsSwiperChange", {
        detail: {
          eventName,
          activeIndex: swiper.activeIndex,
          realIndex: swiper.realIndex,
          swiperEl: homeStatsSwiperEl,
        },
      })
    );
  };

  if (homeStatsSwiperEl.swiper) homeStatsSwiperEl.swiper.destroy(true, true);

  const homeStatsSwiper = new Swiper(homeStatsSwiperEl, {
    // Optional parameters

    loop: true,
    slidesPerView: 1,
    // If we need pagination
    ...(homeStatsPaginationEl
      ? {
          pagination: {
            el: homeStatsPaginationEl,
            clickable: true,
            bulletClass: "swiper-pagination-bullet",
            bulletActiveClass: "swiper-pagination-bullet-active",
            renderBullet: function (index, className) {
              return '<span class="' + className + '">' + String(index + 1).padStart(2, "0") + "</span>";
            },
          },
        }
      : {}),
    speed: 450,
    spaceBetween: 16,
    ...(homeStatsNextEl && homeStatsPrevEl
      ? {
          navigation: {
            nextEl: homeStatsNextEl,
            prevEl: homeStatsPrevEl,
          },
        }
      : {}),
    ...(homeStatsScrollbarEl
      ? {
          scrollbar: {
            el: homeStatsScrollbarEl,
            draggable: true,
          },
        }
      : {}),
    on: {
      init: function () {
        emitHomeStatsSwiperChange(this, "init");
      },
      slideChange: function () {
        emitHomeStatsSwiperChange(this, "slideChange");
      },
      transitionEnd: function () {
        emitHomeStatsSwiperChange(this, "transitionEnd");
      },
    },
  });

  emitHomeStatsSwiperChange(homeStatsSwiper, "created");
});