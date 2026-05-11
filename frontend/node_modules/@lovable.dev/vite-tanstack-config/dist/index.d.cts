import { PluginOption, UserConfig, ConfigEnv, UserConfigFnObject, UserConfigFnPromise, UserConfigFn } from 'vite';

interface LovableViteTanstackOptions {
    plugins?: PluginOption[];
    vite?: UserConfig;
    serverFnErrorLogger?: boolean;
    cloudflare?: Record<string, unknown> | false;
    /** Options forwarded to tanstackStart(). */
    tanstackStart?: Record<string, unknown>;
    /** Options forwarded to viteReact(). */
    react?: Record<string, unknown>;
    /** Set to false to disable automatic VITE_* env define injection. Default: true. */
    envDefine?: boolean;
    /**
     * Options for the HMR gate plugin (@lovable.dev/vite-plugin-hmr-gate).
     * Enabled by default in sandbox mode. Set to false to disable, or pass options
     * to customise behaviour. Set to true or an options object to enable outside sandbox.
     */
    hmrGate?: boolean | Record<string, unknown>;
}
declare function defineConfig(config: UserConfig): (env: ConfigEnv) => Promise<UserConfig>;
declare function defineConfig(config: Promise<UserConfig>): (env: ConfigEnv) => Promise<UserConfig>;
declare function defineConfig(config: UserConfigFnObject): (env: ConfigEnv) => Promise<UserConfig>;
declare function defineConfig(config: UserConfigFnPromise): (env: ConfigEnv) => Promise<UserConfig>;
declare function defineConfig(config: UserConfigFn): (env: ConfigEnv) => Promise<UserConfig>;
declare function defineConfig(options?: LovableViteTanstackOptions): (env: ConfigEnv) => Promise<UserConfig>;

export { type LovableViteTanstackOptions, defineConfig };
