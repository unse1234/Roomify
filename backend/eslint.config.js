import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
    },
  },
  {
    // The logger is the one place console output is intentional; scripts and
    // tests print freely.
    files: ["src/tests/**/*.js", "scripts/**/*.js", "src/utils/logger.js"],
    rules: { "no-console": "off" },
  },
  {
    // k6 load scripts run inside the k6 runtime, not Node: they import from
    // k6/* and read the runner's __ENV / __VU / __ITER globals.
    files: ["scripts/perf/bench.js", "scripts/*load-test.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        __ENV: "readonly",
        __VU: "readonly",
        __ITER: "readonly",
      },
    },
  },
  prettier,
];
