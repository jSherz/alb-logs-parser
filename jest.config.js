module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
};
