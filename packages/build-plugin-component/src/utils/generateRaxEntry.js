const path = require('path');
const generateEntry = require('./generateEntry');
const { NODE } = require('../constants');

// 通过对 md 文档的解析，为每个 md 文档生成了对应的 demo js 文件
function generateRaxEntry(demos, rootDir, targets) {
  // generate demo entry
  const entries = {};
  // ssr bundles 暂时不考虑
  const serverBundles = {};

  demos.forEach((demo) => {
    const { filename } = demo;
    // 根据 demo 解析的信息，生成一个 js 文件作为 demo 的解析入口
    const entryPath = path.join(rootDir, 'node_modules', `rax-demo-${filename}.js`);

    entries[filename] = entryPath;

    // 根据 demo 解析信息和模板生成 demo 入口文件
    generateEntry({
      template: 'raxTemplate.hbs',
      outputPath: entryPath,
      params: {
        demos: [demo],
      },
    });
  });

  if (targets.includes(NODE)) {
    // generate ssr server bundle
    demos.forEach((demo) => {
      const { filename } = demo;
      const entryPath = path.join(rootDir, 'node_modules', `rax-demo-${filename}.server.js`);
      serverBundles[filename] = entryPath;
      generateEntry({
        template: 'raxSSRTemplate.hbs',
        outputPath: entryPath,
        params: {
          demos: [demo],
        },
      });
    });
  }

  return { entries, serverBundles };
}

module.exports = generateRaxEntry;