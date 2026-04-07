const prehideStyle = document.createElement("style");
prehideStyle.id = "anim-script-prehide";
prehideStyle.textContent = `
  @media (min-width: 991px) {
    [cards-anim] > *,
    [cards-anim-above] > *,
    [from-bottom],
    [text-anim] {
      opacity: 0;
      visibility: hidden;
    }
  }
`;
document.head.appendChild(prehideStyle);

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add("(min-width: 991px)", () => {
    document.querySelectorAll("[cards-anim]").forEach((container) => {
      const items = [...container.children];
      const delay = parseFloat(container.getAttribute("cards-delay")) || 0;

      gsap.set(items, { autoAlpha: 0, y: 50 });

      gsap.to(items, {
        scrollTrigger: {
          trigger: container,
          start: "top 85%",
          //   once: true,
        },
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        delay: delay, // ⬅ затримка з атрибута
        ease: "power2.out",
        clearProps: "opacity,visibility,transform",
      });
    });

    document.querySelectorAll("[cards-anim-above]").forEach((container) => {
      const items = [...container.children];
      const delay = parseFloat(container.getAttribute("cards-delay")) || 0;

      gsap.set(items, { autoAlpha: 0, y: -50 });

      gsap.to(items, {
        scrollTrigger: {
          trigger: container,
          start: "top 70%",
          //   once: true,
        },
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        delay: delay,
        ease: "power2.out",
        clearProps: "opacity,visibility,transform",
      });
    });

    document.querySelectorAll("[from-bottom]").forEach((element) => {
      const delay = parseFloat(element.getAttribute("cards-delay")) || 0;

      gsap.set(element, { autoAlpha: 0, y: 50 });

      gsap.to(element, {
        scrollTrigger: {
          trigger: element,
          start: "top 85%",
          once: true,
        },
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        delay: delay,
        ease: "power2.out",
        clearProps: "opacity,visibility,transform",
      });
    });

    gsap.utils.toArray("[text-anim]").forEach((el) => {
      const wrapper = document.createElement("div");
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      gsap.set(el, { y: "100%", autoAlpha: 0 });

      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap.to(el, {
            y: "0%",
            autoAlpha: 1,
            duration: 1,
            ease: "power3.out",
            clearProps: "opacity,visibility,transform",
          });
        },
      });
    });

    ScrollTrigger.refresh();
    prehideStyle.remove();
  });


    // ========================================================
  // CARDS GROW — scroll-driven scale + parallax
  // ========================================================
  (function setupCardsGrow() {
    const elements = document.querySelectorAll("[cards-grow]");
    if (!elements.length) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    elements.forEach((el) => {
      gsap.fromTo(
        el,
        { scale: 0.95, y: 40 },
        {
          scale: 1.05,
          y: -40,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });
  })();
});
