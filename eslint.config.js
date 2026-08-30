import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/deploy/**",
      "**/drizzle/**",
      "**/coverage/**",
      "**/.omo/**",
      "**/.qwen/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/output/**",
      // External backend checkout used only by cross-repository contracts.
      "**/_contracts/**",
      // Compiled/generated Node scripts (source of truth is the .ts sibling).
      "scripts/**/*.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    rules: {
      // Console output and dynamic API/mock payloads are intentional in this
      // application, so they should not make the repository diagnostics noisy.
      "no-console": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
