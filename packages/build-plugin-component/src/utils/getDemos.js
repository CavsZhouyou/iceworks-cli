/**
 * get demos from demo dir
 */
const { readdirSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

module.exports = function getDemos(demoPath, markdownParser) {
  if (!existsSync(demoPath)) {
    return [];
  }

  // 读取 demo 文件夹下的 md 文件
  return readdirSync(demoPath)
    .filter(file => /\.md$/.test(file))
    .map(filename => {
      const filePath = join(demoPath, filename);
      const content = readFileSync(filePath, 'utf-8');

      // 通过 md parser 解析获取到 md 信息，md parser 的作用是将 md 内容转换为 html 标签，只是展示用的，和最后的 js 打包没有关系
      const {
        // md 文档的源信息
        meta,
        // jsx 代码转换后的高亮 html 标签，单独提取出来的作用是什么？
        highlightedCode,
        // 剩余 md 内容转换后的 html 标签，后面应该会被作为 demo 文件的 description 来展示 
        content: markdownContent,
        // css 代码转换后的高亮 html 标签
        highlightedStyle,
      } = markdownParser(content, {
        // sliceCode 的作用目前看来，就是单独获取 highlightedCode 和 highlightedStyle 标签
        sliceCode: true,
        demoPath,
      });

      // 文件名称去掉 md 后缀
      filename = filename.replace(/\.md$/, '');

      // 生成 href 跳转链接
      const href = `/?demo=${filename}`;

      return {
        // demo 对应的 href 链接
        href,
        // demo 的文件名称
        filename,
        // demo 的绝对路径
        filePath,
        ...meta,
        // demo 对应的 jsx 代码的高亮 html 标签
        highlightedCode,
        // demo 除 jsx 外的 md 内容转换的 html 标签
        markdownContent,
        // demo css 代码转换后的高亮 html 标签
        highlightedStyle,
      };
    })
    .sort((a, b) => {
      // 根据 order 对 md 文档进行排序
      return a.order - b.order;
    });
};
