/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const isProd = process.env.NODE_ENV === "production";
const repoName = "Gene-Scope";

/** @type {import("next").NextConfig} */
const config = {
    reactStrictMode: false,
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    eslint: { ignoreDuringBuilds: true },
    ...(isProd
        ? { basePath: `/${repoName}`, assetPrefix: `/${repoName}/` }
        : {}),
};

export default config;
