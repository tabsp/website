const js = require("@eslint/js")
const react = require("eslint-plugin-react")
const reactHooks = require("eslint-plugin-react-hooks")
const jsxA11y = require("eslint-plugin-jsx-a11y")
const prettier = require("eslint-config-prettier")

module.exports = [
  js.configs.recommended,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        process: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        test: "readonly",
      },
    },
    settings: {
      react: {
        version: "18",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      ...prettier.rules,
    },
  },
  {
    files: ["**/*.test.js", "**/__tests__/**/*.{js,jsx}", "tests/**/*.js"],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
  {
    ignores: ["public/", ".cache/", "node_modules/"],
  },
]
