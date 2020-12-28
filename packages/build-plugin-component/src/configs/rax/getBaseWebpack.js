const path = require('path');
const Chain = require('webpack-chain');
const { setBabelAlias } = require('rax-compile-config');
const getBabelConfig = require('rax-babel-config');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ProgressPlugin = require('webpackbar');
const TimeFixPlugin = require('time-fix-plugin');

module.exports = (context, options) => {
  const { rootDir, command, pkg, webpack } = context;
  const { isES6, target, name } = options || {};
  const config = new Chain();

  // 生成 babel 配置
  const babelConfig = getBabelConfig({
    // 是否使用内联设置
    styleSheet: true,
    isES6,
    custom: {
      ignore: ['**/**/*.d.ts'],
    },
  });

  // 设置 babel runtime 别名，很好奇 babel runtime 是怎么引入的？
  setBabelAlias(config);

  // 设置编译目标为 web 环境
  config.target('web');
  config.context(rootDir);
  config.output.publicPath('/');

  // native 模块提取
  config.externals([
    function (ctx, request, callback) {
      if (request.indexOf('@weex-module') !== -1) {
        return callback(null, `commonjs ${request}`);
      }
      // Built-in modules in QuickApp
      if (request.indexOf('@system') !== -1) {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ]);

  // 设置模块的扩展解析顺序
  config.resolve.extensions.merge(['.js', '.json', '.jsx', '.ts', '.tsx', '.html']);

  config.module
    .rule('jsx')
    .test(/\.(js|mjs|jsx)$/)
    .use('babel-loader')
    .loader(require.resolve('babel-loader'))
    .options(babelConfig);

  config.module
    .rule('tsx')
    .test(/\.tsx?$/)
    .use('babel-loader')
    .loader(require.resolve('babel-loader'))
    .options(babelConfig)
    .end()
    .use('ts')
    .loader(require.resolve('ts-loader'));

  // 平台代码做 tree-shaking
  if (options.enablePlatformLoader && target) {
    ['jsx', 'tsx'].forEach((rule) => {
      config.module.rule(rule)
        .use('platform')
        .loader(require.resolve('rax-compile-config/src/platformLoader'))
        .options({ platform: target });
    });
  }

  // md 文件处理，在这里来引入 md 中的 code 
  config.module
    .rule('md')
    .test(/\.md$/)
    .use('babel-loader')
    .loader(require.resolve('babel-loader'))
    .options(babelConfig)
    .end()
    .use('markdown-loader')
    .loader(require.resolve('../../webpackLoader/raxDemoLoader'));

  config.module
    .rule('assets')
    .test(/\.(svg|png|webp|jpe?g|gif)$/i)
    .use('source')
    .loader(require.resolve('image-source-loader'));

  // 强制使用磁盘绝对路径，避免兼容性问题
  config.plugin('caseSensitivePaths').use(CaseSensitivePathsPlugin);

  // 错误时不影响输出
  config.plugin('noError').use(webpack.NoEmitOnErrorsPlugin);

  // minify
  if (!options.minify) {
    // disable minify code
    config.optimization.minimize(options.minify);
  }

  if (command === 'start') {
    config.mode('development');
    config.devtool('inline-module-source-map');
  } else if (command === 'build') {
    config.mode('production');
    // support production sourcemap
    if (options.sourceMap) {
      config.devtool(typeof options.sourceMap === 'string' ? options.sourceMap : 'source-map');
    }
    // 代码压缩
    config.optimization
      .minimizer('terser')
      .use(TerserPlugin, [
        {
          terserOptions: {
            output: {
              ascii_only: true,
              comments: false,
            },
          },
          extractComments: false,
          sourceMap: !!options.sourceMap,
        },
      ])
      .end()
      .minimizer('optimizeCSS')
      .use(OptimizeCSSAssetsPlugin);
  }

  // 设置包别名，供 demo 文件使用
  if (pkg.name) {
    config.resolve.alias.set(pkg.name, path.resolve(rootDir, 'src/index'));
  }

  // webpackbar 可视化进度
  config
    .plugin('ProgressPlugin')
    .use(ProgressPlugin, [
      {
        color: '#F4AF3D',
        name: name || target || 'webpack',
      },
    ]);
  // fix 可能导致的无限循环问题
  // fix: https://github.com/webpack/watchpack/issues/25
  config.plugin('TimeFixPlugin').use(TimeFixPlugin);

  return config;
};
