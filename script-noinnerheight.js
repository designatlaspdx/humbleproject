document.addEventListener("DOMContentLoaded", function () {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const lenis = new Lenis();

  const LOADER_MIN_VISIBLE_MS = 2000;
  const LOADER_MAX_WAIT_MS = 3000;
  const LOADER_HIDE_ANIMATION_MS = 700;
  const loaderShownAt = performance.now();
  let loaderPageReady = false;
  let loaderMinWaitTimer = null;
  let canvasControlsLoaderReady = false;
  let loaderHidden = false;
  let pageLoaded = document.readyState === "complete";
  let keepTopRafId = null;

  // Public loader readiness signal for other scripts on this page load.
  window.loaderIsReady = false;

  const keepTopDuringLoader = () => {
    if (loaderHidden) {
      keepTopRafId = null;
      return;
    }

    forceScrollTop();
    lenis.scrollTo(0, { immediate: true, force: true });
    keepTopRafId = requestAnimationFrame(keepTopDuringLoader);
  };

  const preventNativeScrollWhileLoaderVisible = (event) => {
    if (loaderHidden) return;
    event.preventDefault();
    forceScrollTop();
  };

  const preventScrollKeysWhileLoaderVisible = (event) => {
    if (loaderHidden) return;

    const blockedKeys = [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
    ];

    if (!blockedKeys.includes(event.key)) return;
    event.preventDefault();
    forceScrollTop();
  };

  const enforceTopOnNativeScrollWhileLoaderVisible = () => {
    if (loaderHidden) return;
    if (window.scrollY !== 0 || window.pageYOffset !== 0) {
      forceScrollTop();
    }
  };

  const bindLoaderTopLock = () => {
    window.addEventListener("wheel", preventNativeScrollWhileLoaderVisible, {
      passive: false,
    });
    window.addEventListener(
      "touchmove",
      preventNativeScrollWhileLoaderVisible,
      {
        passive: false,
      }
    );
    window.addEventListener("keydown", preventScrollKeysWhileLoaderVisible, {
      passive: false,
    });
    window.addEventListener(
      "scroll",
      enforceTopOnNativeScrollWhileLoaderVisible,
      {
        passive: true,
      }
    );

    if (keepTopRafId === null) {
      keepTopRafId = requestAnimationFrame(keepTopDuringLoader);
    }
  };

  const unbindLoaderTopLock = () => {
    window.removeEventListener("wheel", preventNativeScrollWhileLoaderVisible);
    window.removeEventListener(
      "touchmove",
      preventNativeScrollWhileLoaderVisible
    );
    window.removeEventListener("keydown", preventScrollKeysWhileLoaderVisible);
    window.removeEventListener(
      "scroll",
      enforceTopOnNativeScrollWhileLoaderVisible
    );

    if (keepTopRafId !== null) {
      cancelAnimationFrame(keepTopRafId);
      keepTopRafId = null;
    }
  };

  const forceScrollTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const startLenisAfterLoad = () => {
    syncLenisAndScrollTrigger("load-start", { force: true });
    setTimeout(() => {
      syncLenisAndScrollTrigger("load+500ms");
    }, 500);

    // Catch late layout growth (fonts, async media, component hydration).
    [1200, 2200, 3500].forEach((delay) => {
      setTimeout(() => {
        syncLenisAndScrollTrigger(`post-load-${delay}ms`);
      }, delay);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        syncLenisAndScrollTrigger("fonts-ready");
      });
    }
  };

  const maybeStartLenis = () => {
    if (!loaderHidden || !pageLoaded) return;
    lenis.start();
    startLenisAfterLoad();
  };

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  forceScrollTop();
  lenis.scrollTo(0, { immediate: true, force: true });
  bindLoaderTopLock();
  requestAnimationFrame(forceScrollTop);
  window.addEventListener("load", forceScrollTop, { once: true });

  const hideLoader = () => {
    const loader = document.querySelector("[data-loader], #loader");
    if (!loader || loader.dataset.hiding === "true") return;

    // Ensure we are at top before beginning loader hide animation.
    forceScrollTop();
    lenis.scrollTo(0, { immediate: true, force: true });

    loader.dataset.hiding = "true";
    loader.classList.add("is-hiding");
    loader.style.pointerEvents = "none";

    setTimeout(() => {
      loader.style.display = "none";
      loaderHidden = true;
      window.loaderIsReady = true;
      window.dispatchEvent(new CustomEvent("loaderReady"));
      unbindLoaderTopLock();
      maybeStartLenis();
    }, LOADER_HIDE_ANIMATION_MS);
  };

  const tryHideLoader = () => {
    const loader = document.querySelector("[data-loader], #loader");
    if (!loader || loader.dataset.hiding === "true") return;

    const elapsed = performance.now() - loaderShownAt;
    const minDurationMet = elapsed >= LOADER_MIN_VISIBLE_MS;

    if (!loaderPageReady || !minDurationMet) {
      const remaining = Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed);
      if (loaderMinWaitTimer) clearTimeout(loaderMinWaitTimer);
      loaderMinWaitTimer = setTimeout(() => {
        loaderMinWaitTimer = null;
        tryHideLoader();
      }, remaining);
      return;
    }

    hideLoader();
  };

  const markLoaderReady = () => {
    loaderPageReady = true;
    tryHideLoader();
  };

  setTimeout(() => {
    markLoaderReady();
  }, LOADER_MAX_WAIT_MS);

  const getDocHeight = () => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(
      doc.scrollHeight,
      doc.offsetHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
  };

  let lastSyncedDocHeight = 0;
  let syncQueued = false;

  const syncLenisAndScrollTrigger = (label, options = {}) => {
    const { force = false } = options;
    if (syncQueued) return;
    syncQueued = true;

    requestAnimationFrame(() => {
      syncQueued = false;

      const currentHeight = getDocHeight();
      const changed = currentHeight !== lastSyncedDocHeight;
      if (!force && !changed) {
        return;
      }

      lastSyncedDocHeight = currentHeight;

      lenis.resize();
      ScrollTrigger.refresh();
    });
  };
  window.__syncLenisAndScrollTrigger = syncLenisAndScrollTrigger;

  // Start Lenis after full page load so initial limits are calculated from settled layout.
  lenis.stop();
  if (document.readyState === "complete") {
    pageLoaded = true;
    maybeStartLenis();
  } else {
    window.addEventListener(
      "load",
      () => {
        pageLoaded = true;
        maybeStartLenis();
      },
      { once: true }
    );
  }

  window.addEventListener("load", () => {
    if (!canvasControlsLoaderReady) {
      markLoaderReady();
    }
  });

  let hasScrolled = false;

  lenis.on("scroll", () => {
    // On first scroll, refresh ScrollTrigger measurements
    if (!hasScrolled) {
      hasScrolled = true;
      syncLenisAndScrollTrigger("first-scroll", { force: true });
    }
    ScrollTrigger.update();
  });
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // ========================================================
  // RESPONSIVE ANIMATION HELPERS
  // ========================================================
  const mm = gsap.matchMedia();
  const CANVAS_SCROLL_MULTIPLIER_DESKTOP = 6;
  const CANVAS_SCROLL_MULTIPLIER_MOBILE = 4;
  const CANVAS_SCROLL_MOBILE_MAX_WIDTH = 767;

  const getCanvasScrollMultiplier = () => {
    return window.innerWidth <= CANVAS_SCROLL_MOBILE_MAX_WIDTH
      ? CANVAS_SCROLL_MULTIPLIER_MOBILE
      : CANVAS_SCROLL_MULTIPLIER_DESKTOP;
  };

  const mmQueries = {
    "sm-up": "(min-width: 480px)",
    "md-up": "(min-width: 768px)",
    "lg-up": "(min-width: 992px)",
    "xl-up": "(min-width: 1280px)",
    "xxl-up": "(min-width: 1440px)",

    "sm-down": "(max-width: 479px)",
    "md-down": "(max-width: 767px)",
    "lg-down": "(max-width: 991px)",
    "xl-down": "(max-width: 1279px)",
    "xxl-down": "(max-width: 1439px)",

    "sm-only": "(min-width: 480px) and (max-width: 767px)",
    "md-only": "(min-width: 768px) and (max-width: 991px)",
    "lg-only": "(min-width: 992px) and (max-width: 1279px)",
    "xl-only": "(min-width: 1280px) and (max-width: 1439px)",
  };

  // Runs setupFn inside mm.add() when el has [data-gsap-mm], otherwise runs it directly.
  // setupFn may return a GSAP-style cleanup function.
  const mmRun = (el, setupFn) => {
    const key = el?.getAttribute("data-gsap-mm");
    const query = key && mmQueries[key];
    if (query) {
      mm.add(query, setupFn);
    } else {
      setupFn();
    }
  };

  // ========================================================
  // CANVAS HERO ANIMATION
  // ========================================================
  (function setupCanvasHeroAnimation() {
    const R2_FRAME_BASE_URL =
      "https://pub-2be5e228fbf4428aaf7de80ec0dab76f.r2.dev/humble-hero";
    const LOCAL_FRAME_BASE_URL = "/frames-2";
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
      window.location.hostname
    );
    const FRAME_BASE_URL = isLocalHost
      ? LOCAL_FRAME_BASE_URL
      : R2_FRAME_BASE_URL;
    const pinWrapper = document.querySelector(".home_pin-wrapper");
    if (!pinWrapper) return;
    const canvasSection =
      pinWrapper.closest(".section_home-hero") ||
      document.querySelector(".section_home-hero");

    mmRun(pinWrapper, () => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      let stableCanvasViewportHeight = window.innerHeight;
      let lastViewportWidth = window.innerWidth;
      let lastOrientation = window.matchMedia("(orientation: portrait)").matches
        ? "portrait"
        : "landscape";

      const getStableCanvasViewportHeight = () => {
        return stableCanvasViewportHeight;
      };

      const getCanvasScrollDistance = () => {
        return getStableCanvasViewportHeight() * getCanvasScrollMultiplier();
      };

      const syncCanvasSpacerHeight = () => {
        if (!canvasSection) return;

        const spacers = canvasSection.querySelectorAll(".spacer");
        if (!spacers.length) return;

        const nextHeight = `${getCanvasScrollDistance()}px`;
        spacers.forEach((spacer) => {
          spacer.style.height = nextHeight;
        });
      };

      const updateStableCanvasViewport = () => {
        const nextWidth = window.innerWidth;
        const nextHeight = window.innerHeight;
        const nextOrientation = window.matchMedia("(orientation: portrait)")
          .matches
          ? "portrait"
          : "landscape";

        const widthChanged = nextWidth !== lastViewportWidth;
        const orientationChanged = nextOrientation !== lastOrientation;

        if (!widthChanged && !orientationChanged) {
          return false;
        }

        lastViewportWidth = nextWidth;
        lastOrientation = nextOrientation;
        stableCanvasViewportHeight = nextHeight;
        return true;
      };

      const context = canvas.getContext("2d");
      if (!context) return;
      canvasControlsLoaderReady = true;

      const setCanvasSize = () => {
        const pixelRatio = window.devicePixelRatio || 1;
        const availableWidth = document.documentElement.clientWidth;
        const stableHeight = getStableCanvasViewportHeight();
        const availableHeight = stableHeight * pixelRatio;
        canvas.width = availableWidth * pixelRatio;
        canvas.height = availableHeight;
        canvas.style.width = availableWidth + "px";
        canvas.style.height = stableHeight + "px";

        context.scale(pixelRatio, pixelRatio);
      };
      setCanvasSize();
      syncCanvasSpacerHeight();

      const frameCount = 313;
      const currentFrame = (index) => {
        return `${FRAME_BASE_URL}/HUMBLE_TEASER_${(index + 1)
          .toString()
          .padStart(8, "0")}.jpg`;
      };

      let images = [];
      let videoFrames = { frame: 0 };

      let imagesToLoad = frameCount;

      const onLoad = () => {
        imagesToLoad--;
        if (!imagesToLoad) {
          render();
          setupScrollTrigger();

          // Simulate a resize event to recalculate everything after pin-spacer settles
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
          }, 300);
        }
      };

      for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = onLoad;
        img.onerror = function () {
          onLoad.call(this);
        };

        img.src = currentFrame(i);
        images.push(img);
      }

      const render = () => {
        const canvasWidth = document.documentElement.clientWidth;
        const canvasHeight = getStableCanvasViewportHeight();

        context.clearRect(0, 0, canvasWidth, canvasHeight);

        const img = images[videoFrames.frame];
        if (img && img.complete && img.naturalWidth > 0) {
          const imageAspect = img.naturalWidth / img.naturalHeight;
          const canvasAspect = canvasWidth / canvasHeight;

          let drawWidth, drawHeight, drawX, drawY;

          if (imageAspect > canvasAspect) {
            drawHeight = canvasHeight;
            drawWidth = drawHeight * imageAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
          } else {
            drawWidth = canvasWidth;
            drawHeight = drawWidth / imageAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
          }

          context.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        }
      };

      const setupScrollTrigger = () => {
        ScrollTrigger.create({
          trigger: pinWrapper,
          start: "top top",
          end: () => `+=${getCanvasScrollDistance()}px`,
          invalidateOnRefresh: true,
          //  pin: true,
          //  pinSpacing: true,
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;

            const animationProgress = Math.min(progress / 0.95, 1);
            const targetFrame = Math.round(
              animationProgress * (frameCount - 1)
            );
            videoFrames.frame = targetFrame;
            render();
          },
        });

        // Mark loader ready once canvas frames are loaded.
        markLoaderReady();

        // Signal to split-text.js that canvas animation is ready
        window.canvasAnimationIsReady = true;
        window.dispatchEvent(new CustomEvent("canvasAnimationReady"));
      };

      window.addEventListener("resize", () => {
        if (!updateStableCanvasViewport()) {
          render();
          return;
        }

        setCanvasSize();
        syncCanvasSpacerHeight();
        render();
        ScrollTrigger.refresh();
      });
    }); // end mmRun
  })();

  // ========================================================
  // CARD CAROUSEL ANIMATION
  // ========================================================
  (function setupCardCarouselAnimation() {
    // Query all card carousel components
    const carouselComponents = document.querySelectorAll("[data-gsap='cards']");

    // Exit if no components exist
    if (!carouselComponents.length) return;

    // Store reference to lenis for use in click handlers
    const lenisInstance = lenis;

    // Process each carousel component independently
    carouselComponents.forEach((component) => {
      mmRun(component, () => {
        // Query card elements within this component
        const cardContents = component.querySelectorAll(
          "[data-gsap-role='card-content']"
        );
        const cardVisuals = component.querySelectorAll(
          "[data-gsap-role='card-visual']"
        );
        const cardLinks = component.querySelectorAll(
          "[data-gsap-role='card-link']"
        );
        const fillers = component.querySelectorAll("[data-gsap-role='filler']");
        const triggerEl =
          component.querySelector("[data-gsap-role='trigger']") || component;

        const triggerOffsetAttr = component.getAttribute(
          "data-gsap-trigger-offset"
        );
        const triggerOffsetUnits = Number.parseFloat(triggerOffsetAttr);
        const triggerStart = Number.isFinite(triggerOffsetUnits)
          ? `${triggerOffsetUnits * 16}px top`
          : "top top";

        // Skip if elements don't exist in this component
        if (!cardContents.length || !cardVisuals.length || !cardLinks.length)
          return;

        const totalItems = cardContents.length;
        const scrollDistancePerZone = 800; // 200px per zone
        const scrollDistance = totalItems * scrollDistancePerZone; // Total pinSpacing virtual space
        let currentZone = -1; // Start at -1 so first zone (0) always triggers update
        let isSuppressingUpdates = false; // Flag to suppress zone updates during scroll

        const setFillerProgress = (progress) => {
          const clampedProgress = Math.max(0, Math.min(1, progress));
          const nextHeight = `${clampedProgress * 100}%`;

          fillers.forEach((filler) => {
            gsap.set(filler, { height: nextHeight });
          });
        };

        gsap.set(cardContents, { opacity: 0, willChange: "opacity" });
        gsap.set(cardVisuals, { opacity: 0, willChange: "opacity" });
        gsap.set(fillers, { height: "0%", willChange: "height" });

        // Force first items to be visible immediately
        gsap.set(cardContents[0], { opacity: 1 });
        gsap.set(cardVisuals[0], { opacity: 1 });

        // Set first link as active
        cardLinks.forEach((link, idx) => {
          if (idx === 0) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });

        // Create ScrollTrigger for this carousel component
        const st = ScrollTrigger.create({
          trigger: triggerEl,
          start: triggerStart,
          end: `+=${scrollDistance}px`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;

            setFillerProgress(progress);

            // Skip zone updates if we're in the middle of a click-triggered scroll
            if (isSuppressingUpdates) {
              return;
            }

            // Calculate which zone we're in (0, 1, 2, ... totalItems-1)
            const newZone = Math.floor(progress * totalItems);
            const zone = Math.min(newZone, totalItems - 1);

            // Only update if zone changed (improves performance)
            if (zone !== currentZone) {
              currentZone = zone;

              // Update card content opacity
              cardContents.forEach((el, idx) => {
                const targetOpacity = idx === zone ? 1 : 0;
                gsap.to(el, {
                  opacity: targetOpacity,
                  duration: 0.15,
                  ease: "power1.inOut",
                });
              });

              // Update card visual opacity
              cardVisuals.forEach((el, idx) => {
                const targetOpacity = idx === zone ? 1 : 0;
                gsap.to(el, {
                  opacity: targetOpacity,
                  duration: 0.3,
                  ease: "power1.inOut",
                });
              });

              // Update active link
              cardLinks.forEach((link, idx) => {
                if (idx === zone) {
                  link.classList.add("active");
                } else {
                  link.classList.remove("active");
                }
              });
            }
          },
        });

        setFillerProgress(st.progress);

        // Add click listeners to card links for this component
        cardLinks.forEach((link, idx) => {
          link.addEventListener("click", (e) => {
            e.preventDefault();

            // Directly update to this zone (tab-like behavior)
            currentZone = idx - 1; // Set to idx - 1 so the change is recognized
            const targetZone = idx;

            // Calculate scroll position to 20% into target zone's range
            const zoneProgress = (idx + 0.2) / totalItems; // 20% into this zone
            const actualScrollRange = st.end - st.start; // Actual scrollable distance with pinSpacing
            const targetScroll = st.start + zoneProgress * actualScrollRange;

            // Suppress updates to prevent zone cycling during scroll
            isSuppressingUpdates = true;

            // Smoothly scroll to zone position
            lenisInstance.scrollTo(targetScroll, {
              duration: 0.6,
              easing: (t) => {
                // power2.inOut easing
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
              },
              onComplete: () => {
                // Re-enable zone updates after scroll completes
                isSuppressingUpdates = false;
              },
            });

            // Update card content opacity
            cardContents.forEach((el, i) => {
              gsap.to(el, {
                opacity: i === targetZone ? 1 : 0,
                duration: 0.3,
                ease: "power1.inOut",
              });
            });

            // Update card visual opacity
            cardVisuals.forEach((el, i) => {
              gsap.to(el, {
                opacity: i === targetZone ? 1 : 0,
                duration: 0.3,
                ease: "power1.inOut",
              });
            });

            // Update active link
            cardLinks.forEach((link, i) => {
              if (i === targetZone) {
                link.classList.add("active");
              } else {
                link.classList.remove("active");
              }
            });
          });
        });
      }); // end mmRun
    });
  })();

  // ========================================================
  // TAB ANIMATION
  // ========================================================
  /*
  (function setupTabAnimation() {
    // Query all tab animation components
    const tabComponents = document.querySelectorAll("[tab-animation-component]");

    // Exit if no components exist
    if (!tabComponents.length) return;

    // Store reference to lenis for use in click handlers
    const lenisInstance = lenis;

    // Helper function to update tab state with requestAnimationFrame
    const updateTabState = (tabItems, newZone) => {
      requestAnimationFrame(() => {
        tabItems.forEach((item, idx) => {
          if (idx === newZone) {
            item.classList.add("active");
          } else {
            item.classList.remove("active");
          }
        });
      });
    };

    // Process each tab component independently
    tabComponents.forEach((component) => {
      // Query tab items within this component
      const tabItems = component.querySelectorAll("[tab-item]");

      // Skip if tab items don't exist in this component
      if (!tabItems.length) return;

      const totalItems = tabItems.length;
      const scrollDistancePerZone = 200; // 200px per zone
      const scrollDistance = totalItems * scrollDistancePerZone; // Total pinSpacing virtual space
      let currentZone = -1; // Start at -1 so first zone (0) always triggers update
      let isSuppressingUpdates = false; // Flag to suppress zone updates during scroll

      // Set initial state - first tab item active
      tabItems.forEach((item, idx) => {
        if (idx === 0) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      // Create ScrollTrigger for this tab component
      const st = ScrollTrigger.create({
        trigger: component,
        start: "top top",
        end: `+=${scrollDistance}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;

          // Skip zone updates if we're in the middle of a click-triggered scroll
          if (isSuppressingUpdates) {
            return;
          }

          // Calculate which zone we're in (0, 1, 2, ... totalItems-1)
          const newZone = Math.floor(progress * totalItems);
          const zone = Math.min(newZone, totalItems - 1);

          // Only update if zone changed
          if (zone !== currentZone) {
            currentZone = zone;
            updateTabState(tabItems, zone);
          }
        },
      });

      // Add click listeners to tab items for this component
      tabItems.forEach((item, idx) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();

          // Directly update to this zone (tab-like behavior)
          currentZone = idx - 1; // Set to idx - 1 so the change is recognized
          const targetZone = idx;

          // Calculate scroll position to 20% into target zone's range
          const zoneProgress = (idx + 0.2) / totalItems; // 20% into this zone
          const actualScrollRange = st.end - st.start; // Actual scrollable distance with pinSpacing
          const targetScroll = st.start + zoneProgress * actualScrollRange;

          // Suppress updates to prevent zone cycling during scroll
          isSuppressingUpdates = true;

          // Update tab state immediately with requestAnimationFrame
          updateTabState(tabItems, targetZone);

          // Smoothly scroll to zone position
          lenisInstance.scrollTo(targetScroll, {
            duration: 0.6,
            easing: (t) => {
              // power2.inOut easing
              return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            },
            onComplete: () => {
              // Re-enable zone updates after scroll completes
              isSuppressingUpdates = false;
            },
          });
        });
      });
    });
  })();
  */

  // ========================================================
  // TAB ACCORDION ANIMATION
  // ========================================================
  (function setupTabAccordionAnimation() {
    const initializedAttr = "data-gsap-tab-accordion-init";

    const initTabAccordionAnimation = () => {
      const tabComponents = document.querySelectorAll(
        "[data-gsap='tab-accordion']"
      );
      if (!tabComponents.length) return;

      tabComponents.forEach((component) => {
        if (component.hasAttribute(initializedAttr)) return;
        component.setAttribute(initializedAttr, "true");

        mmRun(component, () => {
          const componentCleanups = [];

          const TAB_OPEN_DURATION = 0.52;
          const TAB_CLOSE_DURATION = 0.42;
          const TAB_CONTENT_OPEN_DURATION = 0.58;
          const TAB_CONTENT_CLOSE_DURATION = 0.42;
          const TAB_OPEN_EASE = "power3.out";
          const TAB_CLOSE_EASE = "power2.inOut";

          const tabItems = component.querySelectorAll(
            "[data-gsap-role='tab-item']"
          );
          if (!tabItems.length) {
            component.removeAttribute(initializedAttr);
            return;
          }

          const totalItems = tabItems.length;
          const scrollDistancePerZone = 800;
          const scrollDistance = totalItems * scrollDistancePerZone;
          let currentZone = -1;

          const scrollTriggerElement = component.matches(
            "[data-gsap-role='trigger']"
          )
            ? component
            : component.querySelector("[data-gsap-role='trigger']") ||
              component;

          const triggerOffsetAttr = component.getAttribute(
            "data-gsap-trigger-offset"
          );
          const triggerOffsetUnits = Number.parseFloat(triggerOffsetAttr);
          const triggerStart = Number.isFinite(triggerOffsetUnits)
            ? `${triggerOffsetUnits * 16}px top`
            : "top top";

          const setTabClosedState = (tabItem) => {
            const tabTitle = tabItem.querySelector(
              "[data-gsap-role='tab-title']"
            );
            const tabContent = tabItem.querySelector(
              "[data-gsap-role='tab-content']"
            );
            if (!tabTitle || !tabContent) return;

            tabItem.classList.remove("active");
            tabTitle.classList.remove("active");
            tabContent.classList.remove("active");

            gsap.set(tabItem, {
              paddingTop: "1.25rem",
              paddingBottom: "1.25rem",
            });
            gsap.set(tabTitle, {
              fontFamily: "Geist Mono, monospace",
              fontSize: "14px",
              color: "#ecfd9a",
              fontWeight: "400",
              paddingBottom: "0rem",
            });
            gsap.set(tabContent, {
              height: 0,
              overflow: "hidden",
              opacity: 0,
            });
          };

          const openTab = (tabItem, immediate = false) => {
            const tabTitle = tabItem.querySelector(
              "[data-gsap-role='tab-title']"
            );
            const tabContent = tabItem.querySelector(
              "[data-gsap-role='tab-content']"
            );
            if (!tabTitle || !tabContent) return;

            gsap.killTweensOf(tabItem);
            gsap.killTweensOf(tabTitle);
            gsap.killTweensOf(tabContent);

            tabItem.classList.add("active");
            tabTitle.classList.add("active");
            tabContent.classList.add("active");

            gsap.set(tabTitle, {
              fontFamily: "Funnel Display, sans-serif",
            });

            // Expand content immediately so the panel doesn't visibly grow in height.
            gsap.set(tabContent, {
              height: "auto",
              overflow: "hidden",
            });

            const animationMethod = immediate ? gsap.set : gsap.to;

            animationMethod(tabItem, {
              paddingTop: "1.25rem",
              paddingBottom: "3.125rem",
              duration: TAB_OPEN_DURATION,
              ease: TAB_OPEN_EASE,
            });

            animationMethod(tabTitle, {
              fontSize: "32px",
              color: "#fafff2",
              fontWeight: "400",
              duration: TAB_OPEN_DURATION,
              ease: TAB_OPEN_EASE,
            });

            if (immediate) {
              gsap.set(tabContent, {
                height: "auto",
                overflow: "hidden",
                opacity: 1,
              });
              return;
            }

            gsap.to(tabContent, {
              opacity: 1,
              duration: 0.28,
              ease: TAB_OPEN_EASE,
              onComplete: () => {
                tabContent.style.height = "auto";
                tabContent.style.overflow = "hidden";
                tabContent.style.opacity = "1";
              },
            });
          };

          const closeTab = (tabItem, immediate = false) => {
            const tabTitle = tabItem.querySelector(
              "[data-gsap-role='tab-title']"
            );
            const tabContent = tabItem.querySelector(
              "[data-gsap-role='tab-content']"
            );
            if (!tabTitle || !tabContent) return;

            gsap.killTweensOf(tabItem);
            gsap.killTweensOf(tabTitle);
            gsap.killTweensOf(tabContent);

            tabItem.classList.remove("active");
            tabTitle.classList.remove("active");
            tabContent.classList.remove("active");

            if (tabContent.style.height === "auto") {
              gsap.set(tabContent, { height: tabContent.scrollHeight });
            }

            const animationMethod = immediate ? gsap.set : gsap.to;

            animationMethod(tabItem, {
              paddingTop: "1.25rem",
              paddingBottom: "1.25rem",
              duration: TAB_CLOSE_DURATION,
              ease: TAB_CLOSE_EASE,
            });

            animationMethod(tabTitle, {
              fontSize: "14px",
              color: "#ecfd9a",
              fontWeight: "400",
              paddingBottom: "0rem",
              duration: TAB_CLOSE_DURATION,
              ease: TAB_CLOSE_EASE,
              onComplete: () => {
                tabTitle.style.fontFamily = "Geist Mono, monospace";
              },
            });

            animationMethod(tabContent, {
              opacity: 0,
              duration: 0.24,
              ease: TAB_CLOSE_EASE,
              onComplete: () => {
                tabContent.style.height = "0px";
                tabContent.style.overflow = "hidden";
                tabContent.style.opacity = "0";
              },
            });
          };

          const setZone = (zone, immediate = false) => {
            if (zone === currentZone) return;

            const previousZone = currentZone;
            currentZone = zone;

            if (previousZone >= 0 && tabItems[previousZone]) {
              closeTab(tabItems[previousZone], immediate);
            }

            if (tabItems[zone]) {
              openTab(tabItems[zone], immediate);
            }
          };

          tabItems.forEach((item) => {
            setTabClosedState(item);
          });

          setZone(0, true);

          const st = ScrollTrigger.create({
            trigger: scrollTriggerElement,
            start: triggerStart,
            end: `+=${scrollDistance}px`,
            pin: true,
            pinSpacing: true,
            scrub: 1,
            onUpdate: (self) => {
              const progress = self.progress;
              const newZone = Math.floor(progress * totalItems);
              const zone = Math.min(newZone, totalItems - 1);
              setZone(zone, false);
            },
          });

          componentCleanups.push(() => st.kill());

          componentCleanups.push(() => {
            tabItems.forEach((item) => {
              const tabTitle = item.querySelector(
                "[data-gsap-role='tab-title']"
              );
              const tabContent = item.querySelector(
                "[data-gsap-role='tab-content']"
              );

              item.classList.remove("active");
              tabTitle?.classList.remove("active");
              tabContent?.classList.remove("active");

              gsap.killTweensOf(item);
              if (tabTitle) gsap.killTweensOf(tabTitle);
              if (tabContent) gsap.killTweensOf(tabContent);

              item.removeAttribute("style");
              tabTitle?.removeAttribute("style");
              tabContent?.removeAttribute("style");
            });
            component.removeAttribute(initializedAttr);
          });
          return () => componentCleanups.forEach((fn) => fn());
        });
      });
    };

    initTabAccordionAnimation();
    window.addEventListener("load", initTabAccordionAnimation);
    setTimeout(initTabAccordionAnimation, 2000);
  })();

  // ========================================================
  // ASSETS SCROLL ANIMATION (slot-based scrub)
  // ========================================================
  (function setupAssetsScrollAnimation() {
    const components = document.querySelectorAll(
      "[data-gsap ='assets-scroll']"
    );
    if (!components.length) return;
    const fadeDelayProgress = 0.02;

    const assetItemProgress = {
      1: { start: 0.04, end: 0.2 },
      2: { start: 0.25, end: 0.36 },
      3: { start: 0.41, end: 0.52 },
      4: { start: 0.55, end: 0.7 },
      5: { start: 0.75, end: 0.85 },
    };

    const clamp01 = (value) => Math.max(0, Math.min(1, value));

    components.forEach((component) => {
      mmRun(component, () => {
        const triggerEl = component.matches("[data-gsap-role='trigger']")
          ? component
          : component.querySelector("[data-gsap-role='trigger']");

        if (!triggerEl) return;

        const entries = [];
        const items = component.querySelectorAll("[data-gsap-asset-item]");
        const visuals = Array.from(
          component.querySelectorAll("[data-gsap-asset-visual]")
        );
        const visualsBySlot = new Map();
        let activeVisualSlot = null;

        visuals.forEach((visual) => {
          const slot = visual.getAttribute("data-gsap-asset-visual");
          if (!slot) return;
          visualsBySlot.set(slot, visual);
          gsap.set(visual, {
            opacity: 0,
            willChange: "opacity",
          });
        });

        const setActiveVisualSlot = (slot) => {
          if (slot === activeVisualSlot) return;
          activeVisualSlot = slot;

          visualsBySlot.forEach((visual, visualSlot) => {
            const isActive = slot !== null && visualSlot === slot;
            gsap.to(visual, {
              opacity: isActive ? 1 : 0,
              duration: isActive ? 0.35 : 0.25,
              ease: "power1.out",
              overwrite: "auto",
            });
          });
        };

        items.forEach((item) => {
          const slot = item.getAttribute("data-gsap-asset-item");
          const range = assetItemProgress[slot];
          if (!range || range.end <= range.start) return;

          gsap.set(item, {
            opacity: 0,
            y: 40,
            willChange: "opacity,transform",
          });

          const tl = gsap
            .timeline({ paused: true, defaults: { ease: "none" } })
            .to(item, {
              opacity: 1,
              y: 0,
              duration: 1,
            });

          entries.push({
            item,
            slot,
            start: range.start,
            end: range.end,
            fadeStart: Math.min(1, range.end + fadeDelayProgress),
            tl,
            state: "before",
            fadeTween: null,
          });
        });

        if (!entries.length) return;

        const st = ScrollTrigger.create({
          trigger: triggerEl,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const globalProgress = clamp01(self.progress);
            let nextVisualSlot = null;

            entries.forEach((entry) => {
              if (globalProgress < entry.start) {
                entry.state = "before";
                if (entry.fadeTween) entry.fadeTween.kill();
                gsap.set(entry.item, { opacity: 0, y: 40 });
                entry.tl.progress(0);
                return;
              }

              if (globalProgress > entry.fadeStart) {
                if (entry.state !== "after") {
                  if (entry.fadeTween) entry.fadeTween.kill();
                  entry.tl.progress(1);
                  entry.fadeTween = gsap.to(entry.item, {
                    opacity: 0,
                    duration: 0.25,
                    ease: "power1.out",
                    overwrite: "auto",
                  });
                  entry.state = "after";
                }
                return;
              }

              if (globalProgress > entry.end) {
                if (entry.fadeTween) entry.fadeTween.kill();
                entry.fadeTween = null;
                entry.state = "hold";
                entry.tl.progress(1);
                gsap.set(entry.item, { opacity: 1, y: 0 });
                return;
              }

              nextVisualSlot = entry.slot;

              if (entry.fadeTween) entry.fadeTween.kill();
              entry.fadeTween = null;
              entry.state = "inside";

              const localProgress = clamp01(
                (globalProgress - entry.start) / (entry.end - entry.start)
              );
              entry.tl.progress(localProgress);
            });

            setActiveVisualSlot(nextVisualSlot);
          },
        });

        const initialGlobalProgress = clamp01(st.progress);
        let initialVisualSlot = null;
        entries.forEach((entry) => {
          if (initialGlobalProgress < entry.start) {
            entry.state = "before";
            gsap.set(entry.item, { opacity: 0, y: 40 });
            entry.tl.progress(0);
            return;
          }

          if (initialGlobalProgress > entry.fadeStart) {
            entry.state = "after";
            entry.tl.progress(1);
            gsap.set(entry.item, { opacity: 0, y: 0 });
            return;
          }

          if (initialGlobalProgress > entry.end) {
            entry.state = "hold";
            entry.tl.progress(1);
            gsap.set(entry.item, { opacity: 1, y: 0 });
            return;
          }

          initialVisualSlot = entry.slot;

          entry.state = "inside";

          const localProgress = clamp01(
            (initialGlobalProgress - entry.start) / (entry.end - entry.start)
          );
          entry.tl.progress(localProgress);
        });

        setActiveVisualSlot(initialVisualSlot);
      }); // end mmRun
    });
  })();

  // Simulate a resize after everything is loaded to ensure all measurements are correct
  window.addEventListener("load", () => {
    window.dispatchEvent(new Event("resize"));
  });

  // If main content height changes after load, re-sync once per frame.
  const mainWrapper = document.querySelector(".main-wrapper");
  if (mainWrapper && typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      syncLenisAndScrollTrigger("main-wrapper-resize");
    });
    ro.observe(mainWrapper);

    // Keep observer during initial load period where first-load mismatches occur.
    setTimeout(() => {
      ro.disconnect();
    }, 10000);
  }
});

// ========================================================
// FAQ ACCORDION
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  const items = Array.from(document.querySelectorAll("[accordion-item]"));
  if (!items.length) return;

  const getParts = (item) => {
    const title = item.querySelector("[accordion-title]");
    const content = item.querySelector("[accordion-content]");
    return { title, content };
  };

  const prepContent = (content) => {
    content.style.overflow = "hidden";
    content.style.height = "0px";
    content.style.paddingTop = "0rem";
  };

  const openItem = (item) => {
    const { title, content } = getParts(item);
    if (!title || !content) return;
    if (title.classList.contains("is-active")) return;

    // Start closed, then activate class styles and animate height only.
    content.style.overflow = "hidden";
    content.style.height = "0px";
    content.style.paddingTop = "0rem";

    title.classList.add("is-active");
    content.classList.add("is-active");

    requestAnimationFrame(() => {
      content.style.paddingTop = "1.875rem";
      const targetHeight = content.scrollHeight;
      content.style.height = `${targetHeight}px`;
    });

    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      // Keep the measured pixel height to avoid a final auto-height snap.
      content.removeEventListener("transitionend", onEnd);
    };
    content.addEventListener("transitionend", onEnd);
  };

  const closeItem = (item) => {
    const { title, content } = getParts(item);
    if (!title || !content) return;
    if (!title.classList.contains("is-active")) return;

    // If currently auto, lock to pixel height first
    const startHeight = content.scrollHeight;
    content.style.height = `${startHeight}px`;
    content.style.overflow = "hidden";
    content.style.paddingTop = "1.875rem";

    title.classList.remove("is-active");
    content.classList.remove("is-active");

    requestAnimationFrame(() => {
      content.style.paddingTop = "0rem";
      content.style.height = "0px";
    });

    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      content.removeEventListener("transitionend", onEnd);
    };
    content.addEventListener("transitionend", onEnd);
  };

  // Initial closed state
  items.forEach((item) => {
    const { content } = getParts(item);
    if (content) prepContent(content);
  });

  // Toggle only when title is clicked
  items.forEach((item) => {
    const { title } = getParts(item);
    if (!title) return;

    title.addEventListener("click", () => {
      const isOpen = title.classList.contains("is-active");

      // Close others
      items.forEach((other) => {
        if (other !== item) closeItem(other);
      });

      // Toggle current
      if (isOpen) {
        closeItem(item);
      } else {
        openItem(item);
      }
    });
  });
});

// ========================================================
// Navbar
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector("[navbar]");
  const hamburgerContent = document.querySelector("[hamburger-content]");
  const navbarHamburgerButton = document.querySelector(
    "[navbar-hamburger-button]"
  );

  if (!navbar || !hamburgerContent || !navbarHamburgerButton) return;

  const syncNavbarOpenState = () => {
    const webflowIsOpen =
      navbar.classList.contains("w--open") ||
      navbarHamburgerButton.classList.contains("w--open");

    hamburgerContent.classList.toggle("is-open", webflowIsOpen);
    navbar.classList.toggle("is-open", webflowIsOpen);
  };

  // Initial sync in case Webflow initializes classes just after DOMContentLoaded.
  syncNavbarOpenState();
  requestAnimationFrame(syncNavbarOpenState);

  // Let Webflow handle w--open; we only mirror that state to custom classes.
  navbarHamburgerButton.addEventListener("click", () => {
    requestAnimationFrame(syncNavbarOpenState);
  });

  // Prevent Webflow's outside-click close logic from firing when interacting
  // with custom content that lives outside the native .w-nav-menu element.
  hamburgerContent.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  hamburgerContent.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  // Keep custom state in sync for outside-click close, escape key close, etc.
  const observer = new MutationObserver(syncNavbarOpenState);
  observer.observe(navbar, { attributes: true, attributeFilter: ["class"] });
  observer.observe(navbarHamburgerButton, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

// ========================================================
// LATE SCROLL TRIGGER REFRESH
// Fires after load and once the browser goes idle to
// ensure all ScrollTrigger measurements are correct after
// Webflow and other late-injected content has settled.
// Intentionally standalone — no dependency on any other block.
// ========================================================
window.addEventListener("load", function () {
  if (window.__syncLenisAndScrollTrigger) {
    window.__syncLenisAndScrollTrigger("global-load-handler-start");
  }
  setTimeout(function () {
    if (window.__syncLenisAndScrollTrigger) {
      window.__syncLenisAndScrollTrigger(
        "global-load-handler-timeout-before-resize-event"
      );
    }
    window.dispatchEvent(new Event("resize"));
  }, 500);
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(function () {
      if (window.__syncLenisAndScrollTrigger) {
        window.__syncLenisAndScrollTrigger(
          "global-load-handler-idle-before-resize-event"
        );
      }
      window.dispatchEvent(new Event("resize"));
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const visuals = Array.from(document.querySelectorAll("[technology-visual]"));
  if (!visuals.length) return;

  let currentIndex = 0;
  const showTime = 4000;

  function setActive(index) {
    visuals.forEach((item, i) => {
      item.classList.toggle("active", index === i);
    });
  }

  setActive(currentIndex);

  setInterval(() => {
    currentIndex = (currentIndex + 1) % visuals.length;
    setActive(currentIndex);
  }, showTime);
});
