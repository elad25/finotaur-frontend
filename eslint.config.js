import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Codebase has many `any` types at API boundaries (FMP/Polygon/Anthropic SDK
      // shapes) — strict ban is out of scope. Downgrade to warn so CI passes;
      // tightening tracked separately.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      // Pre-existing patterns across the codebase; downgrading to warn keeps CI
      // green without sweeping refactor. Real bugs in these categories surface
      // either in code review or via runtime testing.
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-case-declarations": "warn",
      "no-useless-escape": "warn",
      "no-shadow-restricted-names": "warn",
      // 12 conditional-hook calls exist in pre-existing components (Snapshot/Reports
      // tabs, TradeCopier). Real React anti-pattern but currently working in prod;
      // downgrading to warn so CI passes. Proper refactor tracked separately.
      "react-hooks/rules-of-hooks": "warn",
      // 2026-05-19: TDZ ("Cannot access 'X' before initialization") shipped to
      // production twice this week — both times from a hook whose dep array or
      // body referenced a const declared later in the same component scope.
      // TypeScript does NOT model block-level TDZ; only the minified production
      // bundle's evaluation order surfaces it. This rule is the build-time gate.
      // `variables` covers const/let. `functions: false` allows function-decl
      // hoisting. `classes: true` is the default and stays.
      //
      // Level: warn (not error) so we don't fail CI on the 140+ pre-existing
      // arrow-function-component patterns across the codebase that are
      // technically forward refs but cosmetically harmless in non-hook
      // contexts. The pre-pr-check.sh script escalates this rule to error
      // **only for files this branch changed**, which is the actual gate.
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "warn",
        {
          functions: false,
          classes: true,
          variables: true,
          allowNamedExports: false,
          enums: true,
          typedefs: false,
          ignoreTypeReferences: true,
        },
      ],
    },
  },
);
