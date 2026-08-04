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

function discordWebhookWithWait(webhookUrl) {
    const url = new URL(webhookUrl);
    url.searchParams.set("wait", "true");
    return url.toString();
}

function discordMessageDeleteUrl(webhookUrl, messageId) {
    const url = new URL(webhookUrl);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/messages/${messageId}`;
    url.search = "";
    return url.toString();
}

async function deleteWebhookMessage(env, messageId) {
    const webhookUrl = env.WEBHOOK_URL;
    if (!webhookUrl || !messageId) return;
    if (webhookUrl.includes("hooks.slack.com")) return;

    try {
        const response = await fetch(discordMessageDeleteUrl(webhookUrl, messageId), {
            method: "DELETE",
        });
        if (!response.ok && response.status !== 404) {
            console.error("Webhook message delete failed:", response.status, await response.text());
        }
    } catch (err) {
        console.error("Webhook message delete error:", err);
    }
}

function formatContactPreference(method, handle) {
    if (method === "instagram") return `Instagram — ${handle || "(not provided)"}`;
    if (method === "discord") return `Discord — ${handle || "(not provided)"}`;
    return "Email";
}

const COMMISSION_TYPE_LABELS = {
    head: "Headshot",
    half: "Half Body",
    full: "Full Body",
};

function formatCommissionType(type) {
    return COMMISSION_TYPE_LABELS[type] || type;
}

async function notifyNewCommission(env, { name, email, type, description, contact, referenceUrls, referenceFiles }) {
    const webhookUrl = env.WEBHOOK_URL;
    if (!webhookUrl) return null;

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
                        `# Commission Request`,
                        ``,
                        ``,
                        `**Name:** ${displayName}`,
                        `**Email:** ${email}`,
                        `**Contact:** ${contact}`,
                        `**Type:** ${formatCommissionType(type)}`,
                        `**Description:** ${description || "(none)"}`,
                        `**References:**\n${refs}`,
                        ``,
                        "<!channel>",
                    ].join("\n"),
                }),
            });
            if (!response.ok) {
                console.error("Webhook failed:", response.status, await response.text());
            }
            return null;
        }

        const content = [
            `# Commission Request`,
            ``,
            ``,
            `**Name:** ${displayName}`,
            `**Email:** ${email}`,
            `**Contact:** ${contact}`,
            `**Type:** ${formatCommissionType(type)}`,
            `**Description:** ${description || "(none)"}`,
            ``,
            "@everyone",
        ].join("\n");

        const filesToSend = referenceFiles.slice(0, 10);
        const imageEmbeds = filesToSend.map((file) => ({
            image: { url: `attachment://${file.name}` },
        }));

        const payload = {
            content,
            embeds: imageEmbeds,
            allowed_mentions: { parse: ["everyone"] },
        };

        const waitUrl = discordWebhookWithWait(webhookUrl);
        let response;

        if (filesToSend.length === 0) {
            response = await fetch(waitUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } else {
            const form = new FormData();
            form.append("payload_json", JSON.stringify(payload));
            filesToSend.forEach((file, i) => {
                form.append(`files[${i}]`, file.blob, file.name);
            });
            response = await fetch(waitUrl, { method: "POST", body: form });
        }

        if (!response.ok) {
            console.error("Webhook failed:", response.status, await response.text());
            return null;
        }

        const message = await response.json();
        return message?.id || null;
    } catch (err) {
        console.error("Webhook error:", err);
        return null;
    }
}

async function handleCommissionCount(env) {
    const result = await env.DATABASE.prepare(
        `SELECT COUNT(*) as count FROM commissions
         WHERE status IN ('Accepted', 'Deposit', 'Progress')`
    ).first();

    return jsonResponse({ count: result?.count ?? 0 });
}

async function ensureStatusToken(env, row) {
    if (row.status_token) return row.status_token;

    const token = crypto.randomUUID();
    await env.DATABASE.prepare(
        `UPDATE commissions SET status_token = ? WHERE id = ? AND status_token IS NULL`
    ).bind(token, row.id).run();

    return token;
}

async function handleListCommissions(request, env) {
    const authError = requireAdmin(request, env);
    if (authError) return authError;

    const { results } = await env.DATABASE.prepare(
        `SELECT id, name, email, type, description, status, contact_method, contact_handle, reference_urls, status_token, time
         FROM commissions
         ORDER BY time DESC`
    ).all();

    const commissions = [];
    for (const row of results) {
        const statusToken = await ensureStatusToken(env, row);
        commissions.push({
            ...row,
            status_token: statusToken,
            typeLabel: formatCommissionType(row.type),
            contact: formatContactPreference(row.contact_method, row.contact_handle),
            references: JSON.parse(row.reference_urls || "[]"),
        });
    }

    return jsonResponse(commissions);
}

async function handleGetCommissionByStatusToken(env, token) {
    if (!token) {
        return errorResponse("Status token is required", 400);
    }

    const row = await env.DATABASE.prepare(
        `SELECT name, type, description, status, reference_urls, time
         FROM commissions
         WHERE status_token = ?`
    ).bind(token).first();

    if (!row) {
        return errorResponse("Commission not found", 404);
    }

    return jsonResponse({
        name: row.name,
        type: row.type,
        typeLabel: formatCommissionType(row.type),
        description: row.description,
        status: row.status,
        time: row.time,
        references: JSON.parse(row.reference_urls || "[]"),
    });
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
        `SELECT reference_urls, webhook_message_id FROM commissions WHERE id = ?`
    ).bind(id).first();

    if (!row) {
        return errorResponse("Commission not found", 404);
    }

    await deleteWebhookMessage(env, row.webhook_message_id);

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
    const contactMethod = formData.get("contact_method")?.toString() || "email";
    const contactHandle = (formData.get("contact_handle")?.toString() || "").trim();
    const contact = formatContactPreference(contactMethod, contactHandle);

    if (!email || !type) {
        return errorResponse("Email and commission type are required");
    }

    if ((contactMethod === "instagram" || contactMethod === "discord") && !contactHandle) {
        return errorResponse("Please provide your contact username");
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

    const statusToken = crypto.randomUUID();

    const webhookMessageId = await notifyNewCommission(env, {
        name,
        email,
        type,
        description,
        contact,
        referenceUrls: uploadedUrls,
        referenceFiles,
    });

    const result = await env.DATABASE.prepare(
        `INSERT INTO commissions (
            name, email, type, description, status,
            contact_method, contact_handle,
            reference_urls, webhook_message_id, status_token
         )
         VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?)`
    ).bind(
        name,
        email,
        type,
        description,
        contactMethod,
        contactMethod === "email" ? "" : contactHandle,
        JSON.stringify(uploadedUrls),
        webhookMessageId,
        statusToken
    ).run();

    return jsonResponse({
        id: result.meta.last_row_id,
        status_token: statusToken,
        success: true,
    }, 201);
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

    const statusMatch = path.match(/^\/api\/commissions\/status\/([^/]+)$/);
    if (statusMatch && request.method === "GET") {
        return handleGetCommissionByStatusToken(env, decodeURIComponent(statusMatch[1]));
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
