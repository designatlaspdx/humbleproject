document.addEventListener("DOMContentLoaded", () => {
  // ========================================================
  // PLUGIN REGISTRATION & VALIDATION
  // ========================================================

  if (typeof gsap === "undefined") {
    console.warn("split-text.js: GSAP is required.");
    return;
  }

  if (typeof SplitText === "undefined") {
    console.warn("split-text.js: GSAP SplitText plugin is required.");
    return;
  }

  if (typeof ScrollTrigger === "undefined") {
    console.warn("split-text.js: GSAP ScrollTrigger plugin is required.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ========================================================
  // CANVAS + HERO TEXT ANIMATION (.section_home-hero)
  // ========================================================
  // Hero text splits on character level with fade opacity
  // Synced to canvas scroll via .section_home-hero trigger
  // Uses WRAPPER_PROGRESS slots for multi-text timing

  const COMPONENT_SELECTOR = "[split-text-component]";
  const TARGET_SELECTOR = "[hero-text-wrapper]";
  const BORDER_SELECTOR =
    ".gradient-line-left, [hero-text-border], .hero-text-border, [hero-text-border-left], .hero-text-border-left, [hero-text-accent], .hero-text-accent";
  const CANVAS_TRIGGER_SELECTOR = ".section_home-hero";
  const CANVAS_SCROLL_MULTIPLIER_DESKTOP = 6;
  const CANVAS_SCROLL_MULTIPLIER_MOBILE = 4;
  const CANVAS_SCROLL_MOBILE_MAX_WIDTH = 767;

  let stableCanvasViewportHeight = window.innerHeight;
  let lastCanvasViewportWidth = window.innerWidth;
  let lastCanvasOrientation = window.matchMedia("(orientation: portrait)")
    .matches
    ? "portrait"
    : "landscape";

  const getCanvasScrollMultiplier = () => {
    return window.innerWidth <= CANVAS_SCROLL_MOBILE_MAX_WIDTH
      ? CANVAS_SCROLL_MULTIPLIER_MOBILE
      : CANVAS_SCROLL_MULTIPLIER_DESKTOP;
  };

  const getStableCanvasViewportHeight = () => {
    return stableCanvasViewportHeight;
  };

  const updateStableCanvasViewport = () => {
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;
    const nextOrientation = window.matchMedia("(orientation: portrait)")
      .matches
      ? "portrait"
      : "landscape";

    const widthChanged = nextWidth !== lastCanvasViewportWidth;
    const orientationChanged = nextOrientation !== lastCanvasOrientation;

    if (!widthChanged && !orientationChanged) {
      return false;
    }

    lastCanvasViewportWidth = nextWidth;
    lastCanvasOrientation = nextOrientation;
    stableCanvasViewportHeight = nextHeight;
    return true;
  };

  // Tune these start/end values (0..1) to align each text block with canvas progress.
  const WRAPPER_PROGRESS = {
    1: { start: 0.00, end: 0.13 },
    2: { start: 0.13, end: 0.32 },
    3: { start: 0.32, end: 0.46 },
    4: { start: 0.46, end: 0.6 },
    5: { start: 0.6, end: 0.74 },
    6: { start: 0.74, end: 0.95 },
  };

  const splitInstances = [];
  const scrubTriggers = [];
  const textTimelines = [];
  const companionBorders = [];
  const BORDER_FADE_IN_DURATION = 0.12;
  const BORDER_FADE_OUT_DURATION = 0.14;
  const BORDER_FADE_IN_EASE = "power1.out";
  const BORDER_FADE_OUT_EASE = "power1.inOut";

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function applyClipTextStyles(charEl, clipParent) {
    const clipStyles = window.getComputedStyle(clipParent);

    // Copy the actual gradient/background from the source span so each split char can render it.
    charEl.style.backgroundImage = clipStyles.backgroundImage;
    charEl.style.backgroundSize = clipStyles.backgroundSize;
    charEl.style.backgroundPosition = clipStyles.backgroundPosition;
    charEl.style.backgroundRepeat = clipStyles.backgroundRepeat;
    charEl.style.backgroundAttachment = clipStyles.backgroundAttachment;
    charEl.style.display = "inline-block";

    charEl.style.webkitBackgroundClip = "text";
    charEl.style.backgroundClip = "text";
    charEl.style.color = "transparent";
    charEl.style.webkitTextFillColor = "transparent";
  }

  function findCompanionBorder(target) {
    const parent = target.parentElement;
    const explicitBorderInTarget = target.querySelector(BORDER_SELECTOR);
    if (explicitBorderInTarget) {
      return explicitBorderInTarget;
    }

    const inlineBorderInTarget = Array.from(target.children).find((child) => {
      const styles = window.getComputedStyle(child);
      const width = parseFloat(styles.width) || child.offsetWidth || 0;

      return styles.position === "absolute" && width <= 3;
    });
    if (inlineBorderInTarget) {
      return inlineBorderInTarget;
    }

    if (!parent) return null;

    const explicitBorderSibling = Array.from(parent.children).find(
      (child) => child !== target && child.matches(BORDER_SELECTOR)
    );
    if (explicitBorderSibling) {
      return explicitBorderSibling;
    }

    const siblingCandidates = Array.from(parent.children).filter(
      (child) => child !== target
    );

    return (
      siblingCandidates.find((child) => {
        const styles = window.getComputedStyle(child);
        const width = parseFloat(styles.width) || child.offsetWidth || 0;

        return styles.position === "absolute" && width <= 3;
      }) || null
    );
  }

  function registerCompanionBorder(borderEl) {
    if (!borderEl || borderEl._splitTextBorderState) return borderEl;

    borderEl._splitTextBorderState = {
      opacity: borderEl.style.opacity,
      willChange: borderEl.style.willChange,
    };
    companionBorders.push(borderEl);
    return borderEl;
  }

  function buildTarget(target) {
    if (target._splitTextInstance) {
      target._splitTextInstance.revert();
      target._splitTextInstance = null;
    }

    const slot = target.getAttribute("hero-text-wrapper");
    const range = WRAPPER_PROGRESS[slot];
    if (!range || range.end <= range.start) return null;

    const usePreloadEffect =
      target.hasAttribute("hero-text-effect") &&
      target.getAttribute("hero-text-effect") === "preload";

    // Force a deterministic base state so stale inline styles can't flash content on refresh.
    gsap.set(target, { autoAlpha: usePreloadEffect ? 1 : 0 });

    const split = new SplitText(target, {
      type: "words,chars",
      wordsClass: "split-word",
      charsClass: "split-char",
    });

    target._splitTextInstance = split;
    splitInstances.push(split);

    const chars = split.chars || [];
    if (!chars.length) return null;

    const words = split.words || [];
    words.forEach((wordEl) => {
      wordEl.style.display = "inline-block";
      wordEl.style.whiteSpace = "nowrap";
    });

    // Group chars by word so gradient can flow across a full word, not reset per char.
    const charsByWord = new Map();
    chars.forEach((charEl) => {
      const wordEl = charEl.closest(".split-word");
      if (!wordEl) return;

      if (!charsByWord.has(wordEl)) {
        charsByWord.set(wordEl, []);
      }
      charsByWord.get(wordEl).push(charEl);
    });

    const companionBorder = registerCompanionBorder(findCompanionBorder(target));

    chars.forEach((charEl) => {
      const clipParent = charEl.closest(
        ".clip-text, [clip-text], .span-gradent-clip, .span-gradient-clip"
      );
      if (!clipParent) return;

      charEl.classList.add("split-char-clip-text");
      applyClipTextStyles(charEl, clipParent);
    });

    // Re-slice gradient so each split char shows its segment of a shared per-word gradient.
    charsByWord.forEach((wordChars, wordEl) => {
      const gradientChars = wordChars.filter((charEl) =>
        charEl.classList.contains("split-char-clip-text")
      );
      if (!gradientChars.length) return;

      const wordRect = wordEl.getBoundingClientRect();
      const wordWidth = Math.max(1, wordRect.width);

      gradientChars.forEach((charEl) => {
        const charRect = charEl.getBoundingClientRect();
        const offsetX = charRect.left - wordRect.left;

        charEl.style.backgroundSize = `${wordWidth}px 100%`;
        charEl.style.backgroundPosition = `${-offsetX}px 0px`;
      });
    });

    if (usePreloadEffect) {
      // Preload mode: start with chars fully visible, then fade out
      gsap.set(chars, { opacity: 1, willChange: "opacity" });
      if (companionBorder) {
        gsap.set(companionBorder, { opacity: 1, willChange: "opacity" });
      }
    } else {
      // Normal mode: start hidden
      gsap.set(chars, { opacity: 0, willChange: "opacity" });
      if (companionBorder) {
        gsap.set(companionBorder, { opacity: 0, willChange: "opacity" });
      }
    }

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    if (usePreloadEffect) {
      // Preload timeline: skip fade-in, go straight to fade-out
      tl.to(chars, {
        opacity: 0,
        duration: 0.5,
        stagger: { each: 0.025, from: "start" },
      }, 0);

      if (companionBorder) {
        tl.to(
          companionBorder,
          {
            opacity: 0,
            duration: BORDER_FADE_OUT_DURATION,
            ease: BORDER_FADE_OUT_EASE,
          },
          0
        );
      }
    } else {
      // Normal timeline: fade-in then fade-out
      if (companionBorder) {
        tl.to(
          companionBorder,
          {
            opacity: 1,
            duration: BORDER_FADE_IN_DURATION,
            ease: BORDER_FADE_IN_EASE,
          },
          0
        );
      }

      tl.to(
        chars,
        {
          opacity: 1,
          duration: 0.5,
          stagger: { each: 0.03, from: "start" },
        },
        BORDER_FADE_IN_DURATION
      ).to(chars, {
        opacity: 0,
        duration: 0.5,
        stagger: { each: 0.025, from: "start" },
      });

      if (companionBorder) {
        const borderFadeOutStart = Math.max(
          0,
          tl.duration() - BORDER_FADE_OUT_DURATION
        );

        tl.to(
          companionBorder,
          {
            opacity: 0,
            duration: BORDER_FADE_OUT_DURATION,
            ease: BORDER_FADE_OUT_EASE,
          },
          borderFadeOutStart
        );
      }
    }

    textTimelines.push(tl);

    return {
      target,
      start: range.start,
      end: range.end,
      revealed: false,
      usePreloadEffect,
      tl,
    };
  }

  function revealEntry(entry) {
    if (entry.revealed) return;
    entry.revealed = true;
    gsap.set(entry.target, { autoAlpha: 1 });
  }

  function hideEntry(entry) {
    if (!entry.revealed) return;
    entry.revealed = false;
    gsap.set(entry.target, { autoAlpha: 0 });
  }

  function shouldShowEntry(entry, localProgress) {
    if (entry.usePreloadEffect) {
      // Preload copy starts visible at top, then is hidden once its fade-out segment completes.
      return localProgress < 1;
    }

    // Normal copy should only be visible while its slot is active (between start and end).
    return localProgress > 0 && localProgress < 1;
  }

  function initSplitText() {
    const components = document.querySelectorAll(COMPONENT_SELECTOR);
    if (!components.length) return;

    const hasAnyTarget = Array.from(components).some((component) =>
      component.querySelector(TARGET_SELECTOR)
    );
    if (!hasAnyTarget) return;

    components.forEach((component) => {
      const targets = component.querySelectorAll(TARGET_SELECTOR);
      const entries = [];

      targets.forEach((target) => {
        const usePreloadEffect =
          target.hasAttribute("hero-text-effect") &&
          target.getAttribute("hero-text-effect") === "preload";
        gsap.set(target, { autoAlpha: usePreloadEffect ? 1 : 0 });

        const entry = buildTarget(target);
        if (entry) entries.push(entry);
      });

      if (!entries.length) return;

      const triggerEl = component.matches(CANVAS_TRIGGER_SELECTOR)
        ? component
        : component.querySelector(CANVAS_TRIGGER_SELECTOR) ||
          document.querySelector(CANVAS_TRIGGER_SELECTOR);
      if (!triggerEl) return;

      const st = ScrollTrigger.create({
        trigger: triggerEl,
        start: "top top",
        end: () =>
          `+=${getStableCanvasViewportHeight() * getCanvasScrollMultiplier()}px`,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const globalProgress = clamp01(self.progress);

          entries.forEach((entry) => {
            const localProgress = clamp01(
              (globalProgress - entry.start) / (entry.end - entry.start)
            );
            if (shouldShowEntry(entry, localProgress)) {
              revealEntry(entry);
            } else {
              hideEntry(entry);
            }
            entry.tl.progress(localProgress);
          });
        },
        // markers: true,
      });

      scrubTriggers.push(st);

      // Apply initial timeline state first, then reveal wrappers to avoid first-frame flash.
      const initialGlobalProgress = clamp01(st.progress);
      entries.forEach((entry) => {
        const localProgress = clamp01(
          (initialGlobalProgress - entry.start) / (entry.end - entry.start)
        );
        if (shouldShowEntry(entry, localProgress)) {
          revealEntry(entry);
        } else {
          hideEntry(entry);
        }
        entry.tl.progress(localProgress);
      });
    });
  }

  function cleanupCanvasAnimation() {
    scrubTriggers.forEach((st) => st.kill());
    scrubTriggers.length = 0;

    textTimelines.forEach((tl) => tl.kill());
    textTimelines.length = 0;

    splitInstances.forEach((inst) => inst.revert());
    splitInstances.length = 0;

    companionBorders.forEach((borderEl) => {
      const originalState = borderEl._splitTextBorderState;
      if (!originalState) return;

      borderEl.style.opacity = originalState.opacity;
      borderEl.style.willChange = originalState.willChange;
      delete borderEl._splitTextBorderState;
    });
    companionBorders.length = 0;
  }

  // ========================================================
  // LINE FILL EFFECT (Outline + Mask Reveal)
  // ========================================================
  // Dual-layer text reveal with outline (static) and fill (animated)
  // Uses clipPath inset animation for left-to-right reveal effect
  // Each [data-gsap='fill-line'] component gets independent ScrollTrigger

  const LINE_COMPONENT_SELECTOR = "[data-gsap='fill-line']";
  // Text nodes inside a fill-line component.
  const LINE_SPLIT_SELECTOR = "[data-gsap-role='fill-line-text']";

  let lineSplitInstances = [];
  let lineComponentSTs = [];

  function getStartPercent(el) {
    const raw = el.getAttribute("data-gsap-trigger-offset");
    if (raw == null) return 60;
    let v = parseFloat(raw);
    if (!isFinite(v)) return 60;
    // remove next line if you ever want true 0%
    if (v === 0) v = 10;
    return Math.min(100, Math.max(0, v));
  }

  function prepareBlocksInComponent(componentEl) {
    const blocks = componentEl.querySelectorAll(LINE_SPLIT_SELECTOR);
    const prepared = [];

    blocks.forEach((block) => {
      if (block._split) {
        block._split.revert();
        block._split = null;
      }

      const split = new SplitText(block, {
        type: "words,chars",
        wordsClass: "split-word",
        charsClass: "split-char",
      });
      lineSplitInstances.push(split);
      block._split = split;

      // Keep words together so they don't break on resize
      const words = split.words || [];
      words.forEach((wordEl) => {
        wordEl.style.display = "inline-block";
        wordEl.style.whiteSpace = "nowrap";

        // Apply gradient outline styling to word spans as well
        const clipParent = wordEl.closest(
          ".clip-text, [clip-text], .span-gradent-clip, .span-gradient-clip-2"
        );
        if (clipParent) {
          const clipStyles = window.getComputedStyle(clipParent);
          if (clipStyles.backgroundImage) {
            wordEl.style.backgroundImage = clipStyles.backgroundImage;
            wordEl.style.backgroundSize = clipStyles.backgroundSize;
            wordEl.style.backgroundPosition = clipStyles.backgroundPosition;
            wordEl.style.backgroundRepeat = clipStyles.backgroundRepeat;
            wordEl.style.backgroundAttachment = clipStyles.backgroundAttachment;
            wordEl.style.webkitBackgroundClip = "text";
            wordEl.style.backgroundClip = "text";
            wordEl.style.color = "transparent";
            wordEl.style.webkitTextFillColor = "transparent";
          }
        }
      });

      // Process each character - create outline + fill layers
      const chars = split.chars || [];
      const allFills = [];

      // Group chars by their parent word to calculate gradient positions
      const charsByWord = new Map();
      chars.forEach((charEl) => {
        const wordEl = charEl.closest(".split-word");
        if (wordEl) {
          if (!charsByWord.has(wordEl)) {
            charsByWord.set(wordEl, []);
          }
          charsByWord.get(wordEl).push(charEl);
        }
      });

      chars.forEach((charEl) => {
        const charText = charEl.textContent;

        // Check if this char's closest parent is a gradient span
        const clipParent = charEl.closest(
          ".clip-text, [clip-text], .span-gradent-clip, .span-gradient-clip-2"
        );

        // Get the word this character belongs to
        const wordEl = charEl.closest(".split-word");
        const wordChars = wordEl ? charsByWord.get(wordEl) : null;
        const charIndexInWord = wordChars ? wordChars.indexOf(charEl) : 0;
        const wordLength = wordChars ? wordChars.length : 1;

        // Create wrapper with relative positioning
        const wrapper = document.createElement("span");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";

        // Store word position info for gradient calculations
        wrapper.dataset.charIndex = charIndexInWord;
        wrapper.dataset.wordLength = wordLength;

        // Create outline - visible as ghost text with gradient
        const outline = document.createElement("span");
        outline.className = "line-outline";
        outline.textContent = charText;
        outline.setAttribute("aria-hidden", "true");
        outline.style.position = "relative";
        outline.style.display = "inline-block";
        outline.style.opacity = "0.3";

        // Apply gradient styling to outline, same as fill but at reduced opacity
        if (clipParent) {
          const clipStyles = window.getComputedStyle(clipParent);
          outline.style.backgroundImage = clipStyles.backgroundImage;
          outline.style.backgroundSize = clipStyles.backgroundSize;
          outline.style.backgroundPosition = clipStyles.backgroundPosition;
          outline.style.backgroundRepeat = clipStyles.backgroundRepeat;
          outline.style.backgroundAttachment = clipStyles.backgroundAttachment;
          outline.style.webkitBackgroundClip = "text";
          outline.style.backgroundClip = "text";
          outline.style.color = "transparent";
          outline.style.webkitTextFillColor = "transparent";
        } else {
          outline.style.color = "inherit";
        }

        // Create fill - will be revealed via opacity
        const fill = document.createElement("span");
        fill.className = "line-fill";
        fill.textContent = charText;
        fill.style.position = "absolute";
        fill.style.top = "0";
        fill.style.left = "0";
        fill.style.display = "inline-block";
        fill.style.opacity = "0";

        // Apply gradient styles ONLY to fill
        if (clipParent) {
          const clipStyles = window.getComputedStyle(clipParent);
          fill.style.backgroundImage = clipStyles.backgroundImage;
          fill.style.backgroundSize = clipStyles.backgroundSize;
          fill.style.backgroundPosition = clipStyles.backgroundPosition;
          fill.style.backgroundRepeat = clipStyles.backgroundRepeat;
          fill.style.backgroundAttachment = clipStyles.backgroundAttachment;
          fill.style.webkitBackgroundClip = "text";
          fill.style.backgroundClip = "text";
          fill.style.color = "transparent";
          fill.style.webkitTextFillColor = "transparent";
        } else {
          // Plain text fill
          fill.style.color = "inherit";
        }

        wrapper.appendChild(outline);
        wrapper.appendChild(fill);
        charEl.parentNode.replaceChild(wrapper, charEl);
        allFills.push(fill);
      });

      // Adjust gradient positions so they flow across the full word, not per-character
      setTimeout(() => {
        block.querySelectorAll(".line-fill, .line-outline").forEach((el) => {
          const wrapper = el.parentElement;
          if (!wrapper || !wrapper.dataset.charIndex) return;

          const charIndex = parseInt(wrapper.dataset.charIndex);
          const wordLength = parseInt(wrapper.dataset.wordLength);

          if (wordLength > 1) {
            // Stretch gradient across full word with larger buffer to prevent edge artifacts
            el.style.backgroundSize = `${(wordLength + 1) * 100}% auto`;
            // Position to show only this character's slice, with larger offset to avoid extreme edge
            const baseOffset = -charIndex * 100;
            const edgeBuffer = charIndex === wordLength - 1 ? 10 : 0; // Larger offset for last char
            el.style.backgroundPosition = `${baseOffset + edgeBuffer}% 0`;
          }
        });
      }, 0);

      prepared.push({ block, split, allFills });
    });

    return prepared;
  }

  function buildTriggersForComponents() {
    const lineComponents = gsap.utils.toArray(LINE_COMPONENT_SELECTOR);
    if (!lineComponents.length) return;

    const hasSplitLineInAnyComponent = lineComponents.some((componentEl) =>
      componentEl.querySelector(LINE_SPLIT_SELECTOR)
    );
    if (!hasSplitLineInAnyComponent) return;

    lineComponentSTs.forEach((st) => st.kill());
    lineComponentSTs = [];

    lineComponents.forEach((componentEl) => {
      const triggerEl = componentEl.matches("[data-gsap-role='trigger']")
        ? componentEl
        : componentEl.querySelector("[data-gsap-role='trigger']") ||
          componentEl;

      const prepared = prepareBlocksInComponent(componentEl);
      if (!prepared.length) return;

      // Collect all fills across all blocks
      const allFills = [];
      prepared.forEach(({ allFills: fills }) => {
        allFills.push(...fills);
      });

      if (!allFills.length) return;

      // Create a paused timeline - each character fills sequentially
      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

      // Animate all fills to fade in sequentially
      tl.to(
        allFills,
        {
          opacity: 1,
          duration: 0.5,
          stagger: { each: 0.05, from: "start" },
        },
        0
      );

      // Create ScrollTrigger that controls the timeline progress
      const st = ScrollTrigger.create({
        trigger: triggerEl,
        start: `top ${getStartPercent(componentEl)}%`,
        end: "top 20%",
        onUpdate: (self) => {
          tl.progress(self.progress);
        },
        // markers: true,
      });

      lineComponentSTs.push(st);

      // Apply initial state
      tl.progress(st.progress);
    });

    ScrollTrigger.refresh();
  }

  function cleanupLineAnimation() {
    lineComponentSTs.forEach((st) => st.kill());
    lineComponentSTs = [];

    lineSplitInstances.forEach((inst) => inst.revert());
    lineSplitInstances = [];
  }

  // ========================================================
  // CLEANUP & INITIALIZATION
  // ========================================================

  function cleanupSplitText() {
    cleanupCanvasAnimation();
    cleanupLineAnimation();
  }

  window.addEventListener("resize", () => {
    if (updateStableCanvasViewport()) {
      ScrollTrigger.refresh();
    }
  });

  // Handle browser back/forward cache (bfcache) restoration
  let isSplitTextInitialized = false;

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      // Page was restored from bfcache - clean up old instances and reinitialize
      cleanupSplitText();
      isSplitTextInitialized = false;
      initSplitText();
      // Reinitialize line animation if needed
      lineAnimationInitialized = false;
      tryInitLineAnimation();
    } else if (!isSplitTextInitialized) {
      // Normal page load
      isSplitTextInitialized = true;
    }
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) {
      // Page is entering bfcache - ensure cleanup to free memory
      cleanupSplitText();
    }
  });

  window.addEventListener("beforeunload", cleanupSplitText);
  isSplitTextInitialized = true;
  initSplitText();

  // Wait for canvas animation to be fully loaded before initializing second animation
  // This prevents race condition where frames are still loading during hard refresh
  const initLineAnimation = () => {
    const lineComponents = document.querySelectorAll(LINE_COMPONENT_SELECTOR);
    if (!lineComponents.length) return;

    const hasSplitLineInAnyComponent = Array.from(lineComponents).some(
      (componentEl) => componentEl.querySelector(LINE_SPLIT_SELECTOR)
    );
    if (!hasSplitLineInAnyComponent) return;

    buildTriggersForComponents();
  };

  const hasCanvasElement = !!document.querySelector("[canvas]");
  let lineAnimationInitialized = false;

  const tryInitLineAnimation = () => {
    if (lineAnimationInitialized) return;

    const loaderReady = window.loaderIsReady === true;
    if (!loaderReady) return;

    // Only wait for canvas readiness on pages that actually include canvas.
    if (hasCanvasElement && !window.canvasAnimationIsReady) return;

    lineAnimationInitialized = true;
    initLineAnimation();
  };

  tryInitLineAnimation();
  window.addEventListener("loaderReady", tryInitLineAnimation, { once: true });

  if (hasCanvasElement && !window.canvasAnimationIsReady) {
    window.addEventListener("canvasAnimationReady", tryInitLineAnimation, {
      once: true,
    });
  }
});
