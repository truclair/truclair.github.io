import { submitCommission } from "./api.js";

const submitButton = document.getElementById("submit");
const progress = document.getElementById("upload-progress");
const bar = document.getElementById("upload-bar");

function updateProgress(percent) {
    bar.style.width = percent + "%";
}

submitButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value != "";
    const type = document.querySelector('input[name="type"]:checked') !== null;
    const tos = document.getElementById("tos").checked == true;
    const contactMethod = document.getElementById("contact-method").value;
    const contactHandle = document.getElementById("contact-handle").value.trim();

    const errors = [];
    if (!email) { errors.push("• Please provide your email."); }
    if (!type) { errors.push("• Select a commission type from the options above."); }
    if (!tos) { errors.push("• Please read and agree to the Terms of Service."); }
    if (contactMethod !== "email" && !contactHandle) {
        const platform = contactMethod === "instagram" ? "Instagram" : "Discord";
        errors.push(`• Please provide your ${platform} username.`);
    }

    if (errors.length > 0) {
        alert("Submission failed:\n\n" + errors.join("\n"));
        return;
    }

    const files = document.getElementById("references").files;

    try {
        submitButton.disabled = true;
        submitButton.innerText = "Uploading...";
        progress.classList.add("show");
        updateProgress(30);

        const formData = new FormData();
        formData.append("name", document.getElementById("name").value);
        formData.append("email", document.getElementById("email").value);
        formData.append("type", document.querySelector('input[name="type"]:checked')?.value);
        formData.append("description", document.getElementById("description").value);
        formData.append("contact_method", contactMethod);
        formData.append("contact_handle", contactHandle);

        for (const file of files) {
            formData.append("references", file);
        }

        updateProgress(60);
        await submitCommission(formData);

        updateProgress(100);
        setTimeout(() => {
            alert("Commission submitted!");
            progress.classList.remove("show");
        }, 300);

        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.querySelectorAll('input[name="type"]').forEach(input => {
            input.checked = false;
        });
        document.getElementById("description").value = "";
        document.getElementById("references").value = "";
        document.getElementById("contact-method").value = "email";
        document.getElementById("contact-method").dispatchEvent(new Event("change"));
        document.getElementById("tos").checked = false;
    } catch (err) {
        console.error("Submission error:", err);
        alert(err.message);
        progress.classList.remove("show");
    } finally {
        submitButton.disabled = false;
        submitButton.innerText = "Submit Request";
    }
});
