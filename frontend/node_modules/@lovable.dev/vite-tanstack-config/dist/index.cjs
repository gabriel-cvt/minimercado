"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  defineConfig: () => defineConfig
});
module.exports = __toCommonJS(src_exports);
var import_lovable_tagger = require("lovable-tagger");
var import_vite = require("vite");
var SANDBOX_ENV_VAR = "DEV_SERVER__PROJECT_PATH";
var LOVABLE_SANDBOX_ENV_VAR = "LOVABLE_SANDBOX";
function isSandboxEnvironment() {
  return process.env[LOVABLE_SANDBOX_ENV_VAR] === "1" || !!process.env[SANDBOX_ENV_VAR];
}
function logWarning(message) {
  console.warn(`[@lovable.dev/vite-tanstack-config] ${message}`);
}
function validateHeaders(config) {
  const headers = config.server?.headers;
  if (!headers)
    return;
  const headerKeys = Object.keys(headers);
  if (headerKeys.length > 0) {
    logWarning(`Your config includes server headers that will be removed in sandbox mode: ${headerKeys.join(", ")}`);
  }
}
function isExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return !["localhost", "127.0.0.1", "::1", "0.0.0.0", "::"].includes(parsed.hostname);
  } catch {
    return false;
  }
}
function validateProxy(config) {
  const proxy = config.server?.proxy;
  if (!proxy)
    return;
  for (const [path, proxyConfig] of Object.entries(proxy)) {
    if (typeof proxyConfig === "string") {
      if (isExternalUrl(proxyConfig)) {
        logWarning(
          `Proxy '${path}' targets external URL: ${proxyConfig}. This may cause issues in the sandbox environment.`
        );
      }
    } else if (proxyConfig) {
      const target = typeof proxyConfig.target === "string" ? proxyConfig.target : void 0;
      if (target && isExternalUrl(target)) {
        logWarning(
          `Proxy '${path}' targets external URL: ${target}. This may cause issues in the sandbox environment.`
        );
      }
      if (proxyConfig.ws) {
        logWarning(`Proxy '${path}' enables WebSocket proxying, which may interfere with HMR.`);
      }
      if (proxyConfig.changeOrigin) {
        logWarning(`Proxy '${path}' changes origin, which may cause CORS issues.`);
      }
    }
  }
}
function validateCors(config) {
  if (config.server?.cors && typeof config.server.cors !== "boolean" && config.server.cors !== null) {
    logWarning("Custom CORS config detected. Sandbox requires specific CORS settings for proxy compatibility.");
  }
}
function validatePort(config) {
  if (config.server?.port && config.server.port !== 8080) {
    logWarning(`Port ${config.server.port} configured, but sandbox requires port 8080. Using 8080.`);
  }
}
function validateConfig(config) {
  validateHeaders(config);
  validateProxy(config);
  validateCors(config);
  validatePort(config);
}
function cleanServerConfig(config) {
  if (config.server?.headers || config.server?.cors || config.server?.proxy) {
    const { headers: _headers, cors: _cors, proxy: _proxy, ...serverRest } = config.server;
    return {
      ...config,
      server: serverRest
    };
  }
  return config;
}
function applyWatchDebounceDefaults(config) {
  const existingWatch = config.server?.watch ?? {};
  const existingAwaitWriteFinish = existingWatch.awaitWriteFinish;
  const hasAwaitWriteFinishObject = !!existingAwaitWriteFinish && typeof existingAwaitWriteFinish === "object" && !Array.isArray(existingAwaitWriteFinish);
  return (0, import_vite.mergeConfig)(config, {
    server: {
      watch: {
        ...existingWatch,
        awaitWriteFinish: {
          ...hasAwaitWriteFinishObject ? existingAwaitWriteFinish : {},
          stabilityThreshold: 1e3,
          pollInterval: 100
        }
      }
    }
  });
}
function devServerFnErrorLogger() {
  const HMR_SEND_KEY = "__TANSTACK_SERVER_FN_HMR_SEND__";
  return {
    name: "dev-server-fn-error-logger",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      globalThis[HMR_SEND_KEY] = (data) => {
        server.ws.send({
          type: "custom",
          event: "server-fn-error",
          data
        });
      };
    },
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/");
      const isTargetModule = normalizedId.includes("/@tanstack/start-server-core/src/server-functions-handler.ts") || normalizedId.includes("/@tanstack/start-server-core/dist/esm/server-functions-handler.js");
      if (!isTargetModule) {
        return null;
      }
      const needle = "const unwrapped = res.result || res.error";
      if (!code.includes(needle)) {
        return null;
      }
      return code.replace(
        needle,
        `${needle}

      if (res?.error) {
        const err = res.error
        const payload = {
          source: 'tanstack',
          type: 'server-fn-error',
          method: request.method,
          url: request.url,
          name: err?.name ?? 'Error',
          message: err?.message ?? String(err),
          stack: typeof err?.stack === 'string' ? err.stack : undefined,
        }
        globalThis.${HMR_SEND_KEY}?.(payload)
      }`
      );
    }
  };
}
function defineConfig(configOrOptions = {}) {
  return async (env) => {
    const { command, mode } = env;
    const isSandbox = isSandboxEnvironment();
    let options;
    if (typeof configOrOptions === "function") {
      const userConfig = await Promise.resolve(configOrOptions(env));
      options = { vite: userConfig };
    } else if (configOrOptions instanceof Promise) {
      options = { vite: await configOrOptions };
    } else {
      const optionObject = configOrOptions && typeof configOrOptions === "object" ? configOrOptions : {};
      const hasLovableKey = "vite" in optionObject || "serverFnErrorLogger" in optionObject || "cloudflare" in optionObject || "tanstackStart" in optionObject || "react" in optionObject || "envDefine" in optionObject || "hmrGate" in optionObject;
      options = hasLovableKey ? optionObject : { vite: optionObject };
    }
    const internalPlugins = [];
    const tailwindcss = (await import("@tailwindcss/vite")).default;
    internalPlugins.push(tailwindcss());
    const tsConfigPaths = (await import("vite-tsconfig-paths")).default;
    internalPlugins.push(tsConfigPaths({ projects: ["./tsconfig.json"] }));
    if (options.serverFnErrorLogger !== false) {
      internalPlugins.push(devServerFnErrorLogger());
    }
    if (options.cloudflare !== false && command === "build") {
      try {
        const { cloudflare } = await import("@cloudflare/vite-plugin");
        const cfOptions = typeof options.cloudflare === "object" && options.cloudflare || {
          viteEnvironment: { name: "ssr" }
        };
        internalPlugins.push(cloudflare(cfOptions));
      } catch {
      }
    }
    const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
    const tanstackStartDefaults = {
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"]
        }
      }
    };
    const tanstackStartOptions = (0, import_vite.mergeConfig)(tanstackStartDefaults, options.tanstackStart ?? {});
    internalPlugins.push(tanstackStart(tanstackStartOptions));
    const viteReact = (await import("@vitejs/plugin-react")).default;
    internalPlugins.push(viteReact(options.react));
    if (command === "serve") {
      const hmrGateOpt = options.hmrGate;
      const enableHmrGate = isSandbox ? hmrGateOpt !== false : !!hmrGateOpt;
      if (enableHmrGate) {
        const { hmrGatePlugin } = await import("@lovable.dev/vite-plugin-hmr-gate");
        const hmrGateOptions = typeof hmrGateOpt === "object" ? hmrGateOpt : {};
        internalPlugins.push(hmrGatePlugin(hmrGateOptions));
      }
    }
    if (command === "serve" && isSandbox) {
      const { devServerBridgePlugin } = await import("@lovable.dev/vite-plugin-dev-server-bridge");
      internalPlugins.push(devServerBridgePlugin());
    }
    if (command === "serve" && mode === "development") {
      internalPlugins.push((0, import_lovable_tagger.componentTagger)());
    }
    let envDefine = {};
    if (options.envDefine !== false) {
      const loadedEnv = (0, import_vite.loadEnv)(mode, process.cwd(), "VITE_");
      for (const [key, value] of Object.entries(loadedEnv)) {
        envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
      }
    }
    let config = {
      define: envDefine,
      resolve: {
        alias: {
          "@": `${process.cwd()}/src`
        },
        dedupe: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "@tanstack/react-query",
          "@tanstack/query-core"
        ]
      },
      plugins: [...internalPlugins, ...options.plugins ?? []]
    };
    if (options.vite) {
      config = (0, import_vite.mergeConfig)(config, options.vite);
    }
    if (isSandbox) {
      validateConfig(config);
      config = cleanServerConfig(
        (0, import_vite.mergeConfig)(config, {
          server: { host: "::", port: 8080, strictPort: true }
        })
      );
    } else {
      config = (0, import_vite.mergeConfig)({ server: { host: "::", port: 8080 } }, config);
    }
    if (isSandbox) {
      return config;
    }
    return applyWatchDebounceDefaults(config);
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineConfig
});
