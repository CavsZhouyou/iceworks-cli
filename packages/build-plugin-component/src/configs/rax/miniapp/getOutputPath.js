const { resolve } = require('path');
const { MINIAPP } = require('../../../constants');

module.exports = (context, { target = MINIAPP, distDir = '' }) => {
  const { rootDir, command, userConfig } = context;

  // 如果用户在小程序原始配置中定义了 distDir，则直接拼接后返回
  if (distDir) {
    return resolve(rootDir, distDir);
  }

  // 获取 userConfig 中用户定义的 outputDir
  const { outputDir = 'lib' } = userConfig;

  if (command === 'build') {
    // 生产模式时，输出到 lib 目录下
    return resolve(rootDir, outputDir, target);
  } else {
    // 开发模式时，输入到 build 目录下的 target/components/Target 
    return resolve(rootDir, 'build', target === MINIAPP ? 'ali-miniapp' : target, 'components', 'Target');
  }
};
