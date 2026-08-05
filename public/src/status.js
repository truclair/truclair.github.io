import { getCommissionByStatusToken } from "./api.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function formatDate(timestamp) {
    if (!timestamp) {
        return "Unknown date";
    }

    const date = new Date(timestamp);

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

const details = document.getElementById("commissionDetails");
const params = new URLSearchParams(window.location.search);
const statusToken = params.get("id");

async function loadCommissionStatus() {
    if (!statusToken) {
        details.innerHTML = `
            <h2>Commission Status</h2>
            <p>Missing status link. Ask for a status link from your commissioner.</p>
        `;
        return;
    }

    details.innerHTML = `<p>Loading commission...</p>`;

    try {
        const commission = await getCommissionByStatusToken(statusToken);

        details.innerHTML = `
            <h2>Commission Status</h2>
            <p class="status-badge"><strong>Status</strong><br><span>${escapeHtml(commission.statusLabel || commission.status)}</span></p>
            <p><strong>Name</strong><br>${escapeHtml(commission.name) || "—"}</p>
            <p><strong>Type</strong><br>${escapeHtml(commission.typeLabel || commission.type)}</p>
            <p><strong>Submitted</strong><br>${escapeHtml(formatDate(commission.time))}</p>
            <p><strong>Description</strong><br>${escapeHtml(commission.description) || "—"}</p>

            <strong>References</strong>
            <div class="reference-images">
                ${
                    commission.references && commission.references.length > 0
                        ? commission.references.map(image => `
                            <img src="${escapeHtml(image)}" class="reference-image" alt="Reference">
                        `).join("")
                        : "<p>No references uploaded.</p>"
                }
            </div>
        `;
    } catch (error) {
        console.error(error);
        details.innerHTML = `
            <h2>Commission Status</h2>
            <p>Could not find this commission. Check that your link is correct.</p>
        `;
    }
}

loadCommissionStatus();
