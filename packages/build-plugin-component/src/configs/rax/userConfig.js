const { BYTEDANCE, MINIAPP, WECHAT_MINIPROGRAM } = require('../../constants');

const CONFIG = {
  process: false,
  global: false,
};

module.exports = [
  // 组件编译目标
  {
    name: 'targets',
    validation: 'array',
  },
  // 编译后应用行内样式
  {
    name: 'inlineStyle',
    validation: 'boolean',
  },
  // 是否移除无关平台代码
  {
    name: 'enablePlatformLoader',
    validation: 'boolean',
  },
  // 文件变化是否实时构建到 dist 目录下
  {
    name: 'watchDist',
    validation: 'boolean',
  },
  // 是否禁用 umd 产物
  {
    name: 'disableUMD',
    validation: 'boolean',
  },
  // compatible with plugins which modifyUserConfig of outputDir
  {
    name: 'outputDir',
    validation: 'string',
  },
  {
    /**
     * support disable mock node env
     * https://webpack.js.org/configuration/node/
     */
    name: 'mockNodeEnv',
    defaultValue: true,
    validation: (val) => {
      return typeof val === 'boolean' || typeof val === 'object';
    },
    configWebpack: (config, value) => {
      if (value === false) {
        Object.keys(CONFIG).forEach((key) => {
          config.node.set(key, CONFIG[key]);
        });
      } else if (typeof value === 'object') {
        Object.keys(value).forEach((key) => {
          config.node.set(key, value[key]);
        });
      }
    },
  },
  // 不同应用的配置文件
  {
    name: BYTEDANCE,
    validation: 'object',
  },
  {
    name: MINIAPP,
    validation: 'object',
  },
  {
    name: WECHAT_MINIPROGRAM,
    validation: 'object',
  },
];