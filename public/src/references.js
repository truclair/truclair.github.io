const referencesInput = document.getElementById("references");
const referencePreview = document.getElementById("reference-preview");

const previewUrls = [];

function clearReferencePreview() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls.length = 0;
    referencePreview.innerHTML = "";
}

function renderReferencePreview() {
    clearReferencePreview();

    const files = Array.from(referencesInput.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
        if (!file.type.startsWith("image/")) return;

        const url = URL.createObjectURL(file);
        previewUrls.push(url);

        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
        img.title = file.name;
        img.className = "reference-image";
        referencePreview.appendChild(img);
    });
}

referencesInput.addEventListener("change", renderReferencePreview);

export { clearReferencePreview };
