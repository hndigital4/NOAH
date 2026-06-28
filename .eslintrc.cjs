/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  rules: {
    "no-console":    "error",
    "no-throw-literal": "error",
    "@typescript-eslint/no-explicit-any":          "error",
    "@typescript-eslint/no-non-null-assertion":    "error",
    "@typescript-eslint/no-unused-vars":           ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/consistent-type-imports":  ["error", { "prefer": "type-imports" }],
    "import/no-duplicates": "error",
    "import/no-cycle":      "error",
    "import/order": [
      "error",
      {
        "groups": ["builtin","external","internal","parent","sibling","index"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }
    ]
  },
  overrides: [
    {
      files: ["**/*.test.ts","**/*.bench.ts"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-console": "off"
      }
    }
  ],
  env: { node: true, es2022: true }
};
