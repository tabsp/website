module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks", "jsx-a11y"],
  settings: {
    react: {
      version: "18",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
  },
  overrides: [
    {
      files: [
        "**/*.test.{js,jsx,ts,tsx}",
        "**/__tests__/**/*.{js,jsx,ts,tsx}",
        "tests/**/*.{js,ts}",
      ],
      env: {
        jest: true,
      },
    },
  ],
  ignorePatterns: ["public/", ".cache/", "node_modules/"],
}
