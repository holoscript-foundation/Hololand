const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'content-script': './src/scripts/content-script.ts',
    'service-worker': './src/scripts/service-worker.ts',
    'devtools': './src/scripts/devtools.ts',
    'injected-hook': './src/scripts/injected-hook.ts',
    'panel': './src/panel/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/devtools.html', to: 'devtools.html' },
        { from: 'public/panel.html', to: 'panel.html' },
        { from: 'public/icons', to: 'icons', noErrorOnMissing: true },
      ],
    }),
  ],
  optimization: {
    minimize: false, // Keep readable for debugging
  },
  devtool: 'cheap-module-source-map',
};
