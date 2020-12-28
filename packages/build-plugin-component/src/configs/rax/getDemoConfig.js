const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { hmrClient } = require('rax-compile-config');
const getBaseWebpack = require('./getBaseWebpack');
const generateRaxDemo = require('../../utils/generateRaxDemo');
const setCSSRule = require('../../utils/setCSSRule');

module.exports = (context, options) => {
  const { command, rootDir } = context;
  const { demos, entries } = options;
  // 获取 webpack 配置
  const config = getBaseWebpack(context, { ...options, name: 'demo' });
  // 生成 portal 页面路径
  const portalPath = generateRaxDemo(demos, context);

  if (command === 'start') {
    config
      .entry('portal')
      .add(hmrClient)
      .add(portalPath);
  } else {
    config.entry('portal').add(portalPath);
  }

  config.output.filename('[name].js');
  config.output.publicPath('./');
  config.output.path(path.join(rootDir, 'build'));

  // 设置 css 规则
  setCSSRule(config, command !== 'start');
  if (command === 'start') {
    config.output.publicPath('/demo');
  } else {
    Object.keys(entries).forEach((entryKey) => {
      config
        .entry(`demo/${entryKey}`)
        .add(entries[entryKey]);

      // 通过 chunk 做到为每个 entry 配置 HtmlWebpackPlugin
      config.plugin(`html4${entryKey}`).use(HtmlWebpackPlugin, [
        {
          inject: true,
          filename: `demo/${entryKey}.html`,
          chunks: [entryKey],
          jsPath: `./${entryKey}.js`,
          template: path.resolve(__dirname, '../../template/raxDemo.html'),
        },
      ]);
    });
    config.plugin('minicss').use(MiniCssExtractPlugin, [
      {
        filename: '[name].css',
      },
    ]);
  }

  config.plugin('html').use(HtmlWebpackPlugin, [
    {
      inject: true,
      filename: command === 'start' ? 'portal' : 'index.html',
      chunks: ['portal'],
      template: path.resolve(__dirname, '../../template/raxPortal.html'),
    },
  ]);

  return config;
};
