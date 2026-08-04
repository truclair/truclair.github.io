var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
__name(errorResponse, "errorResponse");
function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return errorResponse("Unauthorized", 401);
  }
  return null;
}
__name(requireAdmin, "requireAdmin");
async function handleCommissionCount(env) {
  const result = await env.DATABASE.prepare(
    `SELECT COUNT(*) as count FROM commissions
         WHERE status IN ('Accepted', 'Deposit', 'Progress')`
  ).first();
  return jsonResponse({ count: result?.count ?? 0 });
}
__name(handleCommissionCount, "handleCommissionCount");
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
    references: JSON.parse(row.reference_urls || "[]")
  }));
  return jsonResponse(commissions);
}
__name(handleListCommissions, "handleListCommissions");
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
__name(handleUpdateCommission, "handleUpdateCommission");
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
      httpMetadata: { contentType: file.type || "application/octet-stream" }
    });
    uploadedUrls.push(`${url.origin}/api/references/${encodeURIComponent(key)}`);
  }
  const result = await env.DATABASE.prepare(
    `INSERT INTO commissions (name, email, type, description, status, reference_urls)
         VALUES (?, ?, ?, ?, 'Pending', ?)`
  ).bind(name, email, type, description, JSON.stringify(uploadedUrls)).run();
  return jsonResponse({ id: result.meta.last_row_id, success: true }, 201);
}
__name(handleCreateCommission, "handleCreateCommission");
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
__name(handleServeReference, "handleServeReference");
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
__name(handleApi, "handleApi");
var worker_default = {
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
  }
};

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-C13gu8/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-C13gu8/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
