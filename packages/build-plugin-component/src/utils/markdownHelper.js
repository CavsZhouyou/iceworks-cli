const fse = require('fs-extra');
const path = require('path');
const util = require('util');
const marked = require('marked');
const prismjs = require('prismjs');
const yaml = require('js-yaml');
require('prismjs/components/prism-jsx');
require('prismjs/components/prism-bash');
require('prismjs/components/prism-json');

const renderer = new marked.Renderer();
// 定义 inject 模板
// css injection
const styleTemplate = '<style>%s</style>';
const codeTemplate = `
  <div class="markdown">
    <div class="highlight highlight-%s">
      <pre><code language="%s">%s</code></pre>
    </div>
  </div>
`;

// 定义 code 编译格式，使用 prismjs 添加高亮
renderer.code = function (code, lang) {
  // lang = ''
  if (!lang) {
    lang = 'jsx';
  }

  // css 代码直接注入到 style 标签中，后面在模板解析时会直接提取，然后插入到 jsx 代码中
  if (lang === 'css' || lang === 'style') {
    return util.format(styleTemplate, code);
  }

  // 利用 prismjs 实现代码高亮
  const html = prismjs.highlight(
    code,
    prismjs.languages[lang] || prismjs.languages.html,
  );
  // 注入到 code 模板中
  return util.format(codeTemplate, lang, lang, html);
};

// 定义 heading 编译格式，为 heading 添加锚点
renderer.heading = function (text, level) {
  // 将所有空格转换为 ‘-’
  let escapedText = text.replace(/\s+/g, '-');
  // 转换为小写
  escapedText = escapedText.toLowerCase();
  // 去掉首尾的 ’-‘
  escapedText = escapedText.replace(/^-+?|-+?$/, '');

  // escapedText 用来实现锚点
  return `<h${level}>${text}<a id="user-content-${escapedText}" name="${escapedText}" class="anchor" aria-hidden="true" href="#${escapedText}"><span class="octicon octicon-link"></span></a></h${level}>`;
};

// 定义 link 编译格式
renderer.link = function (href, title, text) {
  // 猜测如果是相对路径，则直接返回 a 链接
  if (href.indexOf('http') === 0) {
    return `<a href="${href}" title="${title}">${text}</a>`;
  }

  // 如果是绝对路径，则解析出文件名称，更改后缀为 html
  const fileindex = href.lastIndexOf('/');
  const filename = href.substr(fileindex + 1);
  if (/^([-\w]+)\.md$/.test(filename)) {
    href = href.replace(/\.md$/, '.html');
  }
  title = title || text;
  return `<a href="${href}" title="${title}">${text}</a>`;
};

marked.setOptions({
  renderer,
});

// 直接返回 md 转换后的 html 结果
exports.formatMarkdown = function formatMarkdown(md) {
  const markdownHtml = marked(md);
  return markdownHtml;
};

// 先根据配置项对 md 内容进行解析，然后再对 md 内容进行转换
exports.markdownParser = function markdownParser(md, options = {}) {
  const { sliceCode, demoPath } = options;
  
  // 提取 meta 信息和 md 内容
  function split(str) {
    // 判断是否符合 md 规范
    if (str.slice(0, 3) !== '---') return;
    // 找到出现 --- 或者 ... 的位置
    const matcher = /\n(\.{3}|-{3})/g;
    const metaEnd = matcher.exec(str);
    return (
      metaEnd && [str.slice(0, metaEnd.index), str.slice(matcher.lastIndex)]
    );
  }

  const result = {
    meta: {},
    content: md,
    code: '',
  };
  const splited = split(md);

  if (splited) {
    // 将 yaml string 转换为 js object
    result.meta = yaml.safeLoad(splited[0]);
    // 将 md 内容赋值给 content 属性
    result.content = splited[1];
  }

  // 如果有 jsx 代码，则把 jsx 代码提取出来
  if (sliceCode) {
    // 匹配 ```jsx
    const JSX_REG = /(```)(?:jsx?)([^\1]*?)(\1)/g;
    // 匹配 ```css | ```style
    const STYLE_REG = /(```)(?:css|style?)([^\1]*?)(\1)/g;
    // 匹配 <DemoCode />，猜测应该是一种代码引入的方式
    const DEMO_REG = /<DemoCode\b[^>]*src=['"]?([^'"]*)['"]?\b[^>]*>/;

    const jsxMatched = JSX_REG.exec(result.content);
    const styleMatched = STYLE_REG.exec(result.content);

    // 获取 jsx 代码
    if (jsxMatched) {
      result.code = jsxMatched[2] || '';

      // 判断是否是通过 DemoCode 标签引入的 demo code，如果是则获取 code 赋值给 importCode
      const demoMathed = DEMO_REG.exec(result.code);
      // demoPath 指的是 demo 文件目录地址
      if (demoMathed && demoMathed[1] && demoPath) {
        try {
          result.demoCodeSrc = demoMathed[1];
          // 根据 demoPath 获取 demoCode 的绝对路径，然后获取 demo 的文件详情
          result.importCode = fse.readFileSync(path.join(demoPath, demoMathed[1]), 'utf-8');
        } catch (err) {
          console.log(`[error] fail to get demo code ${demoMathed[1]}`);
        }
      }

      // md 内容中移除 jsx 代码
      result.content = result.content.replace(jsxMatched[0], '');
    }

    if (styleMatched) {
      // 将 css 代码转换为对应 prismjs 高亮的 html 标签，css 类名等在 html 模板里进行定义
      // 转换后的代码还会在 md 解析时插入到 style 标签中
      const styleCode = styleMatched[2] || '';
      result.highlightedStyle = prismjs.highlight(
        styleCode.trim(),
        prismjs.languages.css,
      );
    }

    // 将 jsx 代码转换为对应 prismjs 高亮的 html 标签，css 类名等在 html 模板里进行定义
    result.highlightedCode = prismjs.highlight(
      result.importCode ? result.importCode.trim() : result.code.trim(),
      prismjs.languages.jsx,
    );
  }
  result.content = marked(result.content);

  return result;
};
