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

    // ---------- LIGHTBOX ----------

    const lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.innerHTML = `<img alt="">`;
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector("img");

    const openLightbox = (item) => {
        lightboxImage.src = item.src;
        lightboxImage.alt = item.alt || "";
        document.body.style.overflow = "hidden";

        requestAnimationFrame(() => {
            lightbox.classList.add("is-open");
        });
    };

    const closeLightbox = () => {
        lightbox.classList.remove("is-open");
        document.body.style.overflow = "";
    };

    lightbox.addEventListener("click", closeLightbox);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            closeLightbox();
    });

    // ---------- LOAD IMAGE SIZES ----------

    const images = await Promise.all(
        items.map(item => {
            return new Promise(resolve => {

                const img = new Image();

                img.onload = () => {

                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "gallery-item";
                    button.setAttribute("aria-label", `View ${item.alt || "artwork"}`);

                    const image = document.createElement("img");
                    image.src = item.src;
                    image.alt = item.alt || "";

                    button.appendChild(image);

                    button.addEventListener("click", () => openLightbox(item));

                    resolve({
                        ...item,
                        ratio: img.naturalWidth / img.naturalHeight,
                        button
                    });

                };

                img.src = item.src;

            });
        })
    );

    function layoutGallery() {

        const gap = 8;
        const targetHeight = 220;
        const containerWidth = grid.clientWidth;

        // Remove ROWS only (buttons stay alive)
        grid.replaceChildren();

        let row = [];
        let aspectSum = 0;

        function renderRow(row, aspectSum, justify = true) {

            const rowDiv = document.createElement("div");
            rowDiv.className = "gallery-row";

            let height;

            if (justify) {
                height =
                    (containerWidth - gap * (row.length - 1))
                    / aspectSum;
            }
            else {
                height = targetHeight;
            }

            row.forEach(item => {

                item.button.style.width =
                    `${height * item.ratio}px`;

                item.button.style.height =
                    `${height}px`;

                rowDiv.appendChild(item.button);

            });

            grid.appendChild(rowDiv);

        }

        for (const image of images) {

            row.push(image);
            aspectSum += image.ratio;

            const widthWithout =
                (aspectSum - image.ratio) * targetHeight;

            const widthWith =
                aspectSum * targetHeight;

            if (widthWith >= containerWidth) {

                const diffWithout =
                    Math.abs(containerWidth - widthWithout);

                const diffWith =
                    Math.abs(containerWidth - widthWith);

                if (diffWithout < diffWith && row.length > 1) {

                    row.pop();
                    aspectSum -= image.ratio;

                    renderRow(row, aspectSum);

                    row = [image];
                    aspectSum = image.ratio;

                }
                else {

                    renderRow(row, aspectSum);

                    row = [];
                    aspectSum = 0;

                }

            }

        }

        if (row.length) {
            renderRow(row, aspectSum, false);
        }

    }

    layoutGallery();

    let resizeTimer;

    window.addEventListener("resize", () => {

        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            layoutGallery();
        }, 100);

    });

}

loadGallery();