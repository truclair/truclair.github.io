const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}

function requireAdmin(request, env) {
    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
        return errorResponse("Unauthorized", 401);
    }
    return null;
}

function r2KeyFromReferenceUrl(referenceUrl) {
    try {
        const pathname = new URL(referenceUrl).pathname;
        const prefix = "/api/references/";
        if (!pathname.startsWith(prefix)) return null;
        return decodeURIComponent(pathname.slice(prefix.length));
    } catch {
        return null;
    }
}

async function notifyNewCommission(env, { name, email, type, description, referenceUrls, referenceFiles }) {
    const webhookUrl = env.WEBHOOK_URL;
    if (!webhookUrl) return;

    const displayName = name || "Anonymous";

    try {
        if (webhookUrl.includes("hooks.slack.com")) {
            const refs = referenceUrls.length > 0
                ? referenceUrls.map((u) => u).join("\n")
                : "None";
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: [
                        `*New commission request*`,
                        `*Name:* ${displayName}`,
                        `*Email:* ${email}`,
                        `*Type:* ${type}`,
                        `*Description:* ${description || "(none)"}`,
                        `*References:*\n${refs}`,
                    ].join("\n"),
                }),
            });
            if (!response.ok) {
                console.error("Webhook failed:", response.status, await response.text());
            }
            return;
        }

        const content = [
            "**New commission request**",
            `**Name:** ${displayName}`,
            `**Email:** ${email}`,
            `**Type:** ${type}`,
            `**Description:** ${description || "(none)"}`,
        ].join("\n");

        const filesToSend = referenceFiles.slice(0, 10);
        const imageEmbeds = filesToSend.map((file) => ({
            image: { url: `attachment://${file.name}` },
        }));

        const payload = { content, embeds: imageEmbeds };

        if (filesToSend.length === 0) {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                console.error("Webhook failed:", response.status, await response.text());
            }
            return;
        }

        const form = new FormData();
        form.append("payload_json", JSON.stringify(payload));
        filesToSend.forEach((file, i) => {
            form.append(`files[${i}]`, file.blob, file.name);
        });

        const response = await fetch(webhookUrl, { method: "POST", body: form });
        if (!response.ok) {
            console.error("Webhook failed:", response.status, await response.text());
        }
    } catch (err) {
        console.error("Webhook error:", err);
    }
}

async function handleCommissionCount(env) {
    const result = await env.DATABASE.prepare(
        `SELECT COUNT(*) as count FROM commissions
         WHERE status IN ('Accepted', 'Deposit', 'Progress')`
    ).first();

    return jsonResponse({ count: result?.count ?? 0 });
}

async function handleListCommissions(request, env) {
    const authError = requireAdmin(request, env);
    if (authError) return authError;

    const { results } = await env.DATABASE.prepare(
        `SELECT id, name, email, type, description, status, reference_urls, time
         FROM commissions
         ORDER BY time DESC`
    ).all();

    const commissions = results.map((row) => ({
        ...row,
        references: JSON.parse(row.reference_urls || "[]"),
    }));

    return jsonResponse(commissions);
}

async function handleUpdateCommission(request, env, id) {
    const authError = requireAdmin(request, env);
    if (authError) return authError;

    const body = await request.json();
    const { status } = body;

    if (!status) {
        return errorResponse("Status is required");
    }

    const result = await env.DATABASE.prepare(
        `UPDATE commissions SET status = ? WHERE id = ?`
    ).bind(status, id).run();

    if (result.meta.changes === 0) {
        return errorResponse("Commission not found", 404);
    }

    return jsonResponse({ success: true });
}

async function handleDeleteCommission(request, env, id) {
    const authError = requireAdmin(request, env);
    if (authError) return authError;

    const row = await env.DATABASE.prepare(
        `SELECT reference_urls FROM commissions WHERE id = ?`
    ).bind(id).first();

    if (!row) {
        return errorResponse("Commission not found", 404);
    }

    const referenceUrls = JSON.parse(row.reference_urls || "[]");
    for (const refUrl of referenceUrls) {
        const key = r2KeyFromReferenceUrl(refUrl);
        if (key) {
            await env.REFERENCES.delete(key);
        }
    }

    const result = await env.DATABASE.prepare(
        `DELETE FROM commissions WHERE id = ?`
    ).bind(id).run();

    if (result.meta.changes === 0) {
        return errorResponse("Commission not found", 404);
    }

    return jsonResponse({ success: true });
}

async function handleCreateCommission(request, env, url) {
    const formData = await request.formData();

    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString();
    const type = formData.get("type")?.toString();
    const description = formData.get("description")?.toString() || "";

    if (!email || !type) {
        return errorResponse("Email and commission type are required");
    }

    const uploadedUrls = [];
    const referenceFiles = [];
    const files = formData.getAll("references");

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!(file instanceof File) || file.size === 0) continue;

        const key = `${Date.now()}-${i}-${file.name}`;
        const buffer = await file.arrayBuffer();
        const contentType = file.type || "application/octet-stream";

        await env.REFERENCES.put(key, buffer, {
            httpMetadata: { contentType },
        });

        uploadedUrls.push(`${url.origin}/api/references/${encodeURIComponent(key)}`);

        const attachmentName = `ref-${i + 1}-${file.name.replace(/[^\w.-]/g, "_")}`;
        referenceFiles.push({
            name: attachmentName,
            blob: new Blob([buffer], { type: contentType }),
        });
    }

    const result = await env.DATABASE.prepare(
        `INSERT INTO commissions (name, email, type, description, status, reference_urls)
         VALUES (?, ?, ?, ?, 'Pending', ?)`
    ).bind(name, email, type, description, JSON.stringify(uploadedUrls)).run();

    await notifyNewCommission(env, {
        name,
        email,
        type,
        description,
        referenceUrls: uploadedUrls,
        referenceFiles,
    });

    return jsonResponse({ id: result.meta.last_row_id, success: true }, 201);
}

async function handleServeReference(env, key) {
    const object = await env.REFERENCES.get(decodeURIComponent(key));

    if (!object) {
        return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000");

    return new Response(object.body, { headers });
}

async function handleApi(request, env, url) {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    const path = url.pathname;

    if (path === "/api/commissions/count" && request.method === "GET") {
        return handleCommissionCount(env);
    }

    if (path === "/api/commissions" && request.method === "GET") {
        return handleListCommissions(request, env);
    }

    if (path === "/api/commissions" && request.method === "POST") {
        return handleCreateCommission(request, env, url);
    }

    const updateMatch = path.match(/^\/api\/commissions\/(\d+)$/);
    if (updateMatch && request.method === "PATCH") {
        return handleUpdateCommission(request, env, updateMatch[1]);
    }

    if (updateMatch && request.method === "DELETE") {
        return handleDeleteCommission(request, env, updateMatch[1]);
    }

    const refMatch = path.match(/^\/api\/references\/(.+)$/);
    if (refMatch && request.method === "GET") {
        return handleServeReference(env, refMatch[1]);
    }

    return errorResponse("Not found", 404);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname.startsWith("/api/")) {
            try {
                return await handleApi(request, env, url);
            } catch (err) {
                console.error("API error:", err);
                return errorResponse(err.message || "Internal server error", 500);
            }
        }

        return env.ASSETS.fetch(request);
    },
};
