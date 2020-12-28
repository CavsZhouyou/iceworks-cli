const path = require('path');
const { markdownParser } = require('./markdownHelper');
const generateEntry = require('./generateEntry');
const getReadme = require('./getReadme');

function generateRaxDemo(demos, context) {
  const { rootDir, command, userConfig } = context;

  // 生成 demo portal 文件
  const demoEntry = path.join(rootDir, 'node_modules', 'rax-demoentry.js');
  // 获取 readme 文档 中的 meta 信息和 md 内容
  const { meta, readme } = getReadme(rootDir, markdownParser, console);

  generateEntry({
    template: 'raxEntry.hbs',
    outputPath: demoEntry,
    params: {
      targets: userConfig.targets,
      command,
      title: meta.title,
      docHtml: readme,
      demos,
    },
  });

  return demoEntry;
}

module.exports = generateRaxDemo;