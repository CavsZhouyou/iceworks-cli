const path = require('path');
const fse = require('fs-extra');
const glob = require('glob');
const { setComponentConfig } = require('miniapp-compile-config');
const getWebpackBase = require('../getBaseWebpack');
const getOutputPath = require('./getOutputPath');
const { MINIAPP } = require('../../../constants');

const parseTarget = (target) => (target === MINIAPP ? 'ali-miniapp' : target);
module.exports = (context, target, options = {}, onGetWebpackConfig) => {
  const { rootDir, command } = context;
  const { distDir = '' } = options[target] || {};

  // 根据配置，获取输出路径
  const outputPath = getOutputPath(context, { target, distDir });

  // 获取基础的 webpack 配置
  const config = getWebpackBase(context, {
    disableRegenerator: true,
    name: 'miniapp',
  });

  let entryPath = './src/index';
  if (command === 'start') {

    // 匹配 miniapp-demo 下的 index 文件作为解析入口，这应该是用于小程序调试的，暂时不用考虑
    const miniappDemoFolder = 'miniapp-demo';
    const filesPath = glob.sync('index.*', { cwd: path.join(rootDir, miniappDemoFolder) });
    filesPath.forEach((filePath) => {
      entryPath = `./${miniappDemoFolder}/${filePath}`;
    });
  }

  // 将基础的小程序模板文件复制到对应的构建目录下，构建后的组件会放到 components/Target 下
  // copy template file to build
  const miniappOutput = path.join(rootDir, 'build', parseTarget(target));
  fse.ensureDirSync(miniappOutput);
  fse.copySync(path.join(__dirname, `../../../template/miniapp/${parseTarget(target)}`), miniappOutput);

  // 为什么要在这个回调里面去为不同小程序修改 webpack 配置呢？直接在这个文件里修改不行吗？
  onGetWebpackConfig(`component-build-${target}`, (chainConfig) => {
    setComponentConfig(chainConfig, options[target], {
      context,
      entryPath,
      outputPath,
      target,
    });
  });

  return config;
};
