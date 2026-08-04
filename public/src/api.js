const API_BASE = "/api";

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${response.status})`);
    }

    return response.json();
}

export async function getCommissionCount() {
    const data = await apiFetch("/commissions/count");
    return data.count;
}

export async function submitCommission(formData) {
    return apiFetch("/commissions", {
        method: "POST",
        body: formData,
    });
}

export async function getCommissions(adminToken) {
    return apiFetch("/commissions", {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
}

export async function updateCommissionStatus(id, status, adminToken) {
    return apiFetch(`/commissions/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
    });
}

export async function deleteCommission(id, adminToken) {
    return apiFetch(`/commissions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
    });
}

export async function getCommissionByStatusToken(token) {
    return apiFetch(`/commissions/status/${encodeURIComponent(token)}`);
}

export function getStatusPageUrl(statusToken) {
    return `${window.location.origin}/status.html?id=${encodeURIComponent(statusToken)}`;
}

export function getAdminToken() {
    let token = sessionStorage.getItem("adminToken");
    if (!token) {
        token = prompt("Enter admin token:");
        if (token) {
            sessionStorage.setItem("adminToken", token);
        }
    }
    return token;
}
