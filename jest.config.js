module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": `<rootDir>/tests/jest-preprocess.js`,
  },
  moduleNameMapper: {
    ".+\\.(css|styl|less|sass|scss)$": `identity-obj-proxy`,
    ".+\\.(png|jpg|jpeg|gif|svg|webp|avif)$": `<rootDir>/tests/__mocks__/file-mock.js`,
    "^gatsby$": `<rootDir>/tests/__mocks__/gatsby.js`,
  },
  testPathIgnorePatterns: [`node_modules`, `.cache`, `public`],
  transformIgnorePatterns: [`node_modules/(?!(gatsby)/)`],
  setupFiles: [`<rootDir>/tests/loadershim.js`],
  setupFilesAfterEnv: [`<rootDir>/tests/setup-tests.js`],
}
