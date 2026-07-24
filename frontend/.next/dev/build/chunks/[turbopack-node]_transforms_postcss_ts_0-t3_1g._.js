module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/live-interpreter-web/frontend/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/1h5j_0crtg27._.js",
  "chunks/[root-of-the-server]__0fnhy2z._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/live-interpreter-web/frontend/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];