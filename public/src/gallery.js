async function loadGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;

    const response = await fetch("content.json");
    const data = await response.json();
    const items = data.gallery || [];

    if (!items.length) {
        grid.innerHTML = "<p>No gallery pieces yet.</p>";
        return;
    }

    const lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.innerHTML = `<img alt="">`;
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector("img");
    let closing = false;

    const openLightbox = (item) => {
        closing = false;
        lightbox.classList.remove("is-closing");
        lightboxImage.src = item.src;
        lightboxImage.alt = item.alt || "";
        document.body.style.overflow = "hidden";

        // Force a reflow so the scale-up transition always plays
        void lightbox.offsetWidth;
        requestAnimationFrame(() => {
            lightbox.classList.add("is-open");
        });
    };

    const closeLightbox = () => {
        if (closing || !lightbox.classList.contains("is-open")) return;
        closing = true;
        lightbox.classList.add("is-closing");
        lightbox.classList.remove("is-open");

        const finish = () => {
            lightbox.classList.remove("is-closing");
            lightboxImage.removeAttribute("src");
            document.body.style.overflow = "";
            closing = false;
        };

        lightbox.addEventListener("transitionend", finish, { once: true });
    };

    lightbox.addEventListener("click", () => {
        closeLightbox();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeLightbox();
    });

    items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "gallery-item";
        button.setAttribute("aria-label", `View ${item.alt || "artwork"}`);
        button.innerHTML = `<img src="${item.src}" alt="${item.alt || ""}" loading="lazy">`;

        button.addEventListener("click", () => openLightbox(item));
        grid.appendChild(button);
    });
}

loadGallery();
