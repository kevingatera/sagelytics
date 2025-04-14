/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  plugins: ['prettier-plugin-tailwindcss'],
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  overrides: [
    {
      files: ['src/microservices/**/*.ts', 'src/microservices/**/*.js'],
      options: {
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 80,
      },
    },
  ],
};
