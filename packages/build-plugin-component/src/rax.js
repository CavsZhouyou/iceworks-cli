const path = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const chokidar = require('chokidar');
const getJestConfig = require('rax-jest-config');
const { WEB, WEEX, MINIAPP, WECHAT_MINIPROGRAM, NODE } = require('./constants');
const getMiniappConfig = require('./configs/rax/miniapp/getBase');
const getBaseWebpack = require('./configs/rax/getBaseWebpack');
const getDistConfig = require('./configs/rax/getDistConfig');
const getUMDConfig = require('./configs/rax/getUMDConfig');
const getES6Config = require('./configs/rax/getES6Config');
const generateRaxEntry = require('./utils/generateRaxEntry');
const getDemoDir = require('./utils/getDemoDir');
const getDemos = require('./utils/getDemos');
const { markdownParser } = require('./utils/markdownHelper');
const defaultUserConfig = require('./configs/userConfig');
const raxUserConfig = require('./configs/rax/userConfig');
const babelCompiler = require('./compiler/babel');
const devCompileLog = require('./utils/raxDevCompileLog');
const buildCompileLog = require('./utils/raxBuildCompileLog');
const modifyPkgHomePage = require('./utils/modifyPkgHomePage');
const getDemoConfig = require('./configs/rax/getDemoConfig');

module.exports = ({ registerTask, registerUserConfig, context, onHook, registerCliOption, onGetWebpackConfig, onGetJestConfig, modifyUserConfig, log }) => {
  const { rootDir, userConfig, command, pkg, commandArgs } = context;
  const { plugins, targets, disableUMD, inlineStyle = true, ...compileOptions } = userConfig;

  // 判断编译目标
  if (!(targets && targets.length)) {
    // 提示 e.g. 写法有问题
    console.error(chalk.red('rax-plugin-component need to set targets, e.g. ["rax-plugin-component", targets: ["web", "weex"]]'));
    console.log();
    process.exit(1);
  }
  // 用户参数注册，这两个参数的具体作用是什么？
  // 经过测试来看，skip-demo 的作用是不编译 demo 文件，但是编译结果中，web 无法正常显示
  // watch-dist 的作用是只监听变化编译到 dist 目录，不编译 demo 或者 web 这些文件
  // dist 目录在 start 和 build 时的作用到底是什么？
  const { skipDemo } = commandArgs;
  const watchDist = commandArgs.watchDist || userConfig.watchDist;
  // compatible with rax-seed
  // 什么是兼容 rax-seed，把 watchDist 变换更新到 userConfig 的原因是为了其他 plugin 使用吗？
  modifyUserConfig('watchDist', !!watchDist);
  // register user config
  registerUserConfig(defaultUserConfig.concat(raxUserConfig));

  let entries = {};
  // ssr 方案 bundles 暂时不考虑
  let serverBundles = {};
  let demos = [];

  // register cli options
  // 这里感觉没有必要注册 cli 参数，因为并没有在这里根据 cli 参数来做 webpack 配置的修改
  const cliOptions = ['watch-dist', '--skip-demo'];
  registerCliOption(cliOptions.map((name) => ({
    name,
    commands: ['start', 'build'],
  })));

  // 获取兼容的 demo 文件夹目录名称
  const demoDir = getDemoDir(rootDir);

  // 解析 demo md 文件，生成对应 js 文件作为打包 entry
  const getRaxBundles = () => {
    if (demoDir) {

      // 获取并解析 demo 文件，获得了每个 demo md 文件的解析结果，除了 code 和 importCode 外基本都只是用来展示的
      demos = getDemos(path.join(rootDir, demoDir), markdownParser);
      
      if (demos && demos.length) {
        return generateRaxEntry(demos, rootDir, targets);
      }
    }
    return false;
  };

  // watchDist 为 false 和 skipDemo 为 false 时
  if (!watchDist && !skipDemo) {
    // 为 demo 文件生成 js entry 
    let raxBundles = getRaxBundles();
    // watch demo changes
    // 监听 demo 文件夹，当 demo 文件夹下文件发生变化时，重新为 demo 文件生成 js entry，这个应该是和 build-scripts 结合生效的 
    if (command === 'start') {
      const demoWatcher = chokidar.watch(demoDir, {
        ignoreInitial: false,
        interval: 200,
      });
      // 监听所有类型的文件变化
      demoWatcher.on('all', () => {
        // re-generate entry files when demo changes
        raxBundles = getRaxBundles();
      });
      demoWatcher.on('error', (error) => {
        log.error('fail to watch demo', error);
      });
    }
    if (raxBundles) {
      entries = raxBundles.entries;
      serverBundles = raxBundles.serverBundles;
      const demoConfig = getDemoConfig(context, { ...compileOptions, entries, demos });
      // 编译 portal 文件
      registerTask('component-demo', demoConfig);
    }
  }
  // task name rule `component-build-${target}`.
  // plugins depend on task names, change task name rule will cause break change.
  if (command === 'start' && !watchDist) {
    targets.forEach((target) => {
      const options = { ...compileOptions, target, inlineStyle };
      if ([WEB, WEEX, NODE].includes(target)) {
        // 编译 demos 文件
        // eslint-disable-next-line
        const configDev = require(`./configs/rax/${target}/dev`);
        const defaultConfig = getBaseWebpack(context, options);
        configDev(defaultConfig, context, { ...options, entries, serverBundles });
        registerTask(`component-build-${target}`, defaultConfig);
      } else if ([MINIAPP, WECHAT_MINIPROGRAM].includes(target)) {
        // 获取小程序的配置文件
        options[target] = options[target] || {};

        // 在小程序的原始配置文件中添加一些参数，供解析时使用
        addMiniappTargetParam(target, options[target]);

        const config = getMiniappConfig(context, target, options, onGetWebpackConfig);
        registerTask(`component-build-${target}`, config);
      }
    });
  } else if (command === 'build' || watchDist) {
    // omitLib just for sfc2mp，not for developer
    const disableGenerateLib = userConfig[MINIAPP] && userConfig[MINIAPP].omitLib;

    // clean build results
    fse.removeSync(path.join(rootDir, 'lib'));
    fse.removeSync(path.join(rootDir, 'dist'));
    fse.removeSync(path.join(rootDir, 'build'));
    fse.removeSync(path.join(rootDir, 'es'));

    targets.forEach(target => {
      const options = { ...userConfig, target, inlineStyle };
      if (target === WEB) {
        registerTask(`component-build-${target}`, getDistConfig(context, options));
        registerTask(`component-build-${target}-es6`, getES6Config(context, options));
        if (!disableUMD) {
          registerTask(`component-build-${target}-umd`, getUMDConfig(context, options));
        }
      } else if (target === WEEX) {
        const distConfig = getDistConfig(context, { ...options, inlineStyle: true, entryName: 'index-weex' });
        registerTask('component-build-weex', distConfig);
      } else if (target === MINIAPP || target === WECHAT_MINIPROGRAM) {
        options[target] = options[target] || {};
        addMiniappTargetParam(target, options[target]);
        const config = getMiniappConfig(context, target, options, onGetWebpackConfig);
        registerTask(`component-build-${target}`, config);
      }
    });
    onHook('before.build.load', async () => {
      if (!disableGenerateLib) {
        babelCompiler(context, log, false, compileOptions, 'rax');
      }
    });
  }

  if (watchDist) {
    // disable hot when watch dist file
    onGetWebpackConfig((config) => {
      config.devServer.hot(false);
    });
  }

  onHook('after.build.compile', async (args) => {
    buildCompileLog(args, targets, rootDir, userConfig);
    if (!skipDemo) {
      await modifyPkgHomePage(pkg, rootDir);
    }
  });
  onHook('after.start.compile', async (args) => {
    const devUrl = args.url;
    devCompileLog(args, devUrl, targets, entries, rootDir, { ...userConfig, watchDist });
  });
  if (command === 'test') {
    // jest config
    onGetJestConfig((jestConfig) => {
      const { moduleNameMapper, ...rest } = jestConfig;
      const defaultJestConfig = getJestConfig({ rootDir, moduleNameMapper });
      return {
        ...defaultJestConfig,
        ...rest,
        // defaultJestConfig.moduleNameMapper already combine jestConfig.moduleNameMapper
        moduleNameMapper: defaultJestConfig.moduleNameMapper,
      };
    });
  }
};

/**
 * Add miniapp target param to match jsx2mp-loader config
 * */
function addMiniappTargetParam(target, originalConfig = {}) {
  switch (target) {
    case WECHAT_MINIPROGRAM:
      originalConfig.platform = 'wechat';
      break;
    default:
      break;
  }
  originalConfig.mode = 'watch';
}