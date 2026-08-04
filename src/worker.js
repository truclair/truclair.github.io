const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
    const files = formData.getAll("references");

    for (const file of files) {
        if (!(file instanceof File) || file.size === 0) continue;

        const key = `${Date.now()}-${file.name}`;
        await env.REFERENCES.put(key, file.stream(), {
            httpMetadata: { contentType: file.type || "application/octet-stream" },
        });

        uploadedUrls.push(`${url.origin}/api/references/${encodeURIComponent(key)}`);
    }

    const result = await env.DATABASE.prepare(
        `INSERT INTO commissions (name, email, type, description, status, reference_urls)
         VALUES (?, ?, ?, ?, 'Pending', ?)`
    ).bind(name, email, type, description, JSON.stringify(uploadedUrls)).run();

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
