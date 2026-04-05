module.exports = {
  root: true,
  env: {
    es2022: true,
    browser: true,
  },
  extends: ['expo', 'eslint:recommended'],
  ignorePatterns: ['/dist/*', '/node_modules/*'],
};
