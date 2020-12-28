const path = require('path');
const fs = require('fs');
const hbs = require('handlebars');

module.exports = function generateEntryJS({
  template,
  outputPath,
  params,
}) {
  // 获取模板
  const hbsTemplatePath = path.join(__dirname, `../template/${template}`);
  const hbsTemplateContent = fs.readFileSync(hbsTemplatePath, 'utf-8');

  // 将字符串转为驼峰写法
  hbs.registerHelper('camelCased', (str) => {
    return str.replace(/-([a-z])/g, (math) => (math[1].toUpperCase()));
  });
  // ` 字符转义 
  hbs.registerHelper('escape', (str) => {
    return (str || '').replace(/`/g, '&#x60;');
  });

  // 编译模板
  const compileTemplateContent = hbs.compile(hbsTemplateContent);

  // 模板内容赋值
  const jsTemplateContent = compileTemplateContent(params);

  // 生成文件输出
  fs.writeFileSync(outputPath, jsTemplateContent);
};
