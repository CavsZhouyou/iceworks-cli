module.exports = (api) => {
  const { context, log } = api;
  const { userConfig } = context;

  // 判断组件框架类型，调用对应的编译方法
  if (userConfig.type && !['rax', 'react'].includes(userConfig.type)) {
    log.error('build-plugin-component need to set type react/rax');
  } else {
    const componentType = userConfig.type || 'react';
    // eslint-disable-next-line
    require(`./${componentType}`)(api);
  }
};