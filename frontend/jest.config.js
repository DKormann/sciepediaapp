/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
    }],
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  modulePathIgnorePatterns: [
    "<rootDir>/wailsjs/"
  ]
};