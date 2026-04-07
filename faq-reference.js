/*** FAQ Section */

(() => {
  const items = document.querySelectorAll("[faq-item]");

  items.forEach((item) => {
    const toggle = item.querySelector("[faq-toggle]");
    const content = item.querySelector("[faq-content]");

    if (!toggle || !content) return;

    toggle.addEventListener("click", () => {
      const isActive = item.classList.contains("is-active");

      if (!isActive) {
        // OPEN
        item.classList.add("is-active");

        content.style.height = "0px";
        content.style.overflow = "hidden";

        const targetHeight = content.scrollHeight;

        requestAnimationFrame(() => {
          content.style.height = targetHeight + "px";
        });

        content.addEventListener("transitionend", function handler(e) {
          if (e.propertyName !== "height") return;

          content.style.height = "auto";
          content.style.overflow = "";

          content.removeEventListener("transitionend", handler);
        });
      } else {
        // CLOSE

        // lock current size (including padding) so the transition has a stable starting point
        content.style.height = content.scrollHeight + "px";
        content.style.overflow = "hidden";

        // ensure padding starts at the active value (so we can animate it)
        content.style.paddingBottom = "1.5rem";

        requestAnimationFrame(() => {
          // animate both height + padding to 0
          content.style.height = "0px";
          content.style.paddingBottom = "0px";
        });

        content.addEventListener("transitionend", function handler(e) {
          // only run once when the height animation finishes
          if (e.propertyName !== "height") return;

          item.classList.remove("is-active");

          // cleanup inline overrides
          content.style.height = "";
          content.style.overflow = "";
          content.style.paddingBottom = "";

          content.removeEventListener("transitionend", handler);
        });
      }
    });
  });
})();
