const path = require('path');

module.exports = [
  {
    // 配置路径映射
    name: 'alias',
    validation: 'object',
    configWebpack: (config, alias, context) => {
      const { rootDir } = context;
      const aliasWithRoot = {};
      Object.keys(alias).forEach((key) => {
        if (path.isAbsolute(alias[key])) {
          aliasWithRoot[key] = alias[key];
        } else {
          aliasWithRoot[key] = path.resolve(rootDir, alias[key]);
        }
      });
      config.merge({
        resolve: {
          alias: aliasWithRoot,
        },
      });
    },
  },
  {
    // 打包文件输出值
    name: 'library',
    validation: 'string',
  },
  {
    // 打包文件中需要 export 的子模块
    name: 'libraryExport',
    validation: 'string',
  },
  {
    // 打包文件输出方式
    name: 'libraryTarget',
    validation: 'string',
  },
  {
    // 打包文件名称
    name: 'filename',
    validation: 'string',
  },
  {
    // 是否生成 sourceMap 文件
    name: 'sourceMap',
    validation: 'boolean',
  },
  {
    // 是否压缩文件
    name: 'minify',
    validation: 'boolean',
  },
  {
    // 组件类型
    name: 'type',
    validation: 'string',
  },
  {
    // 调试服务器配置 todo
    name: 'devServer',
    validation: 'object',
    defaultValue: {
      logLevel: 'silent',
      compress: true,
      disableHostCheck: true,
      clientLogLevel: 'error',
      hot: true,
      quiet: true,
      overlay: false,
    },
    configWebpack: (config, devServer, context) => {
      const { command } = context;
      if (command === 'start' && devServer) {
        config.merge({ devServer });
      }
    },
  },
];