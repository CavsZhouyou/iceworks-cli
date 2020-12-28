const { existsSync } = require('fs');
const { join } = require('path');

// 兼容 demo 和 docs 两种文件夹，返回存在的文件夹名称
module.exports = function getDemoPath(projectDir) {
  let demoDir;
  // compatible with directory docs
  const searchDirs = ['demo', 'docs'];
  for (let i = 0; i < searchDirs.length; i++) {
    const searchPath = join(projectDir, searchDirs[i]);
    if (existsSync(searchPath)) {
      demoDir = searchDirs[i];
      break;
    }
  }
  return demoDir;
};
