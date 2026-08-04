const contactMethod = document.getElementById("contact-method");
const contactRow = document.getElementById("contact-row");
const contactHandle = document.getElementById("contact-handle");

const CONTACT_COPY = {
    email: {
        open: false,
        placeholder: "",
    },
    instagram: {
        open: true,
        placeholder: "Your Instagram username*",
    },
    discord: {
        open: true,
        placeholder: "Your Discord username*",
    },
};

function updateContactPanel() {
    const selected = contactMethod.value;
    const config = CONTACT_COPY[selected] || CONTACT_COPY.email;

    contactHandle.placeholder = config.placeholder;

    if (config.open) {
        contactRow.classList.add("open");
        contactHandle.required = true;
        contactHandle.setAttribute("aria-required", "true");
    } else {
        contactRow.classList.remove("open");
        contactHandle.required = false;
        contactHandle.removeAttribute("aria-required");
        contactHandle.value = "";
    }
}

contactMethod.addEventListener("change", updateContactPanel);
updateContactPanel();
