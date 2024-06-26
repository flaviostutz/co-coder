// eslint-disable-next-line import/no-commonjs
module.exports = {
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(tsx?|json?)$': ['@swc/jest'],
  },
  coverageReporters: ['text'],
  collectCoverage: true,
  collectCoverageFrom: ['./src/**', '!**/__tests__/**'],
  coverageThreshold: {
    global: {
      lines: 85,
      functions: 85,
      branches: 50,
    },
  },
};
