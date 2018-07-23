module.exports = {
  parser: 'babel-eslint',
  extends: ['airbnb-base', 'plugin:flowtype/recommended'],
  plugins: ['flowtype'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    'no-console': 'off',
  },
};
