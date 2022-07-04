// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';

const stylesHandler = 'style-loader';

const config = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  devtool: 'inline-source-map',
  devServer: {
    open: true,
    host: 'localhost',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),

    // Add your plugins here
    // Learn more about plugins from https://webpack.js.org/configuration/plugins/
  ],
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext][query]',
        }
      },
      {
        test: /\.(nes)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'roms/[name][ext][query]',
        }
      },
      {
        test: /\.(ts|tsx)$/i,
        loader: 'ts-loader',
        exclude: ['/node_modules/'],
      },
      //{
      //  test: /\.css$/i,
      //  use: [stylesHandler, 'css-loader'],
      //},
      //{
      //  test: /\.s[ac]ss$/i,
      //  use: [stylesHandler, 'css-loader', 'sass-loader'],
      //},
      //{
      //  test: /\.(wgsl|glsl|vs|fs)$/i,
      //  loader: 'ts-shader-loader',
      //},
      //{
      //  test: /\.nes/,
      //  type: 'asset/source',
      //  generator: { filename: 'images/[hash][ext][query]'}
      //},

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  //types: [ '@webgpu/types' ],
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';

    config.plugins.push(new WorkboxWebpackPlugin.GenerateSW());
  } else {
    config.mode = 'development';
  }
  return config;
};
