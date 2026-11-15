const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => ({
  entry: './src/js/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cargova.bundle.js',
    clean: true,
  },
  devtool: argv.mode === 'development' ? 'eval-source-map' : false,
  module: {
    rules: [
      { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, { loader: 'css-loader', options: { url: false } }] },
    ],
  },
  plugins: [new MiniCssExtractPlugin({ filename: 'cargova.css' })],
  performance: { hints: false },
  devServer: {
    static: { directory: __dirname },
    port: 5173,
    open: true,
  },
});
