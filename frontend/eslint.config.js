import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "*.config.ts", "vitest.config.ts", "vite.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Naming conventions per WebHatchery standards
      "@typescript-eslint/naming-convention": [
        "error",
        // Variables and functions: camelCase
        {
          selector: "variableLike",
          format: ["camelCase", "PascalCase", "UPPER_CASE"], // Allow PascalCase for React components
        },
        // Parameters: allow underscore prefix for unused params
        {
          selector: "parameter",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase", "UPPER_CASE"], // Allow PascalCase for React components
        },
        // Types, interfaces, classes: PascalCase
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "class",
          format: ["PascalCase"],
        },
        // Enum values: PascalCase
        {
          selector: "enumMember",
          format: ["PascalCase"],
        },
      ],
      // Allow explicit any in some cases but warn
      "@typescript-eslint/no-explicit-any": "error",
      // No unused variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  // Separate config for config files
  {
    files: ["*.config.{ts,js}", "vitest.config.ts", "vite.config.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {},
  },
  // Test utilities and test specs are not hot-reloaded React modules.
  {
    files: [
      "test/**/*.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
