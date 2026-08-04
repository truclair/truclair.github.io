const description = document.getElementById("description");

function autosizeDescription() {
    if (!description) return;

    description.style.height = "auto";
    description.style.height = `${description.scrollHeight}px`;
}

function resetDescription() {
    if (!description) return;

    description.value = "";
    description.style.height = "";
    autosizeDescription();
}

if (description) {
    description.addEventListener("input", autosizeDescription);

    description.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.shiftKey) return;

        event.preventDefault();

        const start = description.selectionStart;
        const end = description.selectionEnd;

        description.setRangeText("\t", start, end, "end");
        autosizeDescription();
    });

    autosizeDescription();
}

export { resetDescription, autosizeDescription };
