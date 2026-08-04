import { getCommissions, updateCommissionStatus, deleteCommission, getAdminToken } from "./api.js";

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

const list = document.getElementById("commissionList");

async function loadCommissions() {
    const adminToken = getAdminToken();
    if (!adminToken) {
        list.innerHTML = "<p>Authentication required.</p>";
        return;
    }

    let data;
    try {
        data = await getCommissions(adminToken);
    } catch (error) {
        console.error(error);
        if (error.message === "Unauthorized") {
            sessionStorage.removeItem("adminToken");
            list.innerHTML = "<p>Invalid admin token. Refresh to try again.</p>";
            return;
        }
        list.innerHTML = "<p>Failed to load commissions.</p>";
        return;
    }

    list.innerHTML = "";

    if (data.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>No commissions yet.</h3>
                <p>New requests will appear here.</p>
            </div>
        `;
        return;
    }

    data.forEach((commission) => {
        const item = document.createElement("div");
        item.className = "admin-item";

        item.innerHTML = `
            <div class="admin-summary">
                <div>
                    <h3>${commission.name}</h3>
                    <small>${formatDate(commission.time)}</small>
                </div>
                <span class="admin-status">${commission.status}</span>
            </div>

            <div class="admin-details">
                <p><strong>Email</strong><br>${commission.email}</p>
                <p><strong>Contact</strong><br>${commission.contact || "Email"}</p>
                <p><strong>Type</strong><br>${commission.typeLabel || commission.type}</p>
                <p><strong>Description</strong><br>${commission.description}</p>

                <strong>References</strong>
                <div class="reference-images">
                    ${
                        commission.references && commission.references.length > 0
                            ? commission.references.map(image => `
                                <img src="${image}" class="reference-image">
                            `).join("")
                            : "<p>No references uploaded.</p>"
                    }
                </div>

                <select>
                    <option ${commission.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option ${commission.status === "Accepted" ? "selected" : ""}>Accepted</option>
                    <option ${commission.status === "Deposit" ? "selected" : ""}>Deposit</option>
                    <option ${commission.status === "Progress" ? "selected" : ""}>Progress</option>
                    <option ${commission.status === "Completed" ? "selected" : ""}>Completed</option>
                    <option ${commission.status === "Paid" ? "selected" : ""}>Paid</option>
                </select>

                <button type="button" class="admin-delete">Delete commission</button>
            </div>
        `;

        const summary = item.querySelector(".admin-summary");
        summary.addEventListener("click", () => {
            item.classList.toggle("open");
        });

        const select = item.querySelector("select");
        select.addEventListener("change", async () => {
            try {
                await updateCommissionStatus(commission.id, select.value, adminToken);
                item.querySelector(".admin-status").innerText = select.value;
            } catch (error) {
                console.error(error);
                alert("Failed to update status.");
            }
        });

        const deleteBtn = item.querySelector(".admin-delete");
        deleteBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            const label = commission.name || commission.email || "this commission";
            if (!confirm(`Delete ${label}? This will permanently remove the commission and its reference images.`)) {
                return;
            }

            deleteBtn.disabled = true;
            deleteBtn.textContent = "Deleting...";

            try {
                await deleteCommission(commission.id, adminToken);
                item.remove();
                if (!list.querySelector(".admin-item")) {
                    list.innerHTML = `
                        <div class="empty-state">
                            <h3>No commissions yet.</h3>
                            <p>New requests will appear here.</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error(error);
                alert("Failed to delete commission.");
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Delete commission";
            }
        });

        list.appendChild(item);
    });
}

loadCommissions();
