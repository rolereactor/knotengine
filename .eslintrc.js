module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"],
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/.next/**"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unescaped-entities": "off",

    // Q6: Ban console.log in production code — use logger/infra/sentry.ts instead.
    // console methods are allowed in test files and scripts (see overrides below).
    "no-console": "warn",

    // Q7: Convention — always use safeCompare (timing-safe) over === when comparing
    // secrets, API keys, tokens, or HMAC signatures. No automated rule yet (informational).
  },
  env: {
    node: true,
    es2020: true,
    serviceworker: true,
  },
  overrides: [
    {
      files: ["**/public/sw.js"],
      globals: {
        self: "readonly",
        caches: "readonly",
        clients: "readonly",
      },
    },
    // Q6: Allow console methods in test files and scripts.
    {
      files: [
        "**/*.test.ts",
        "**/*.test.js",
        "**/*.spec.ts",
        "**/*.spec.js",
        "**/scripts/**",
      ],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
