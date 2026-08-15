module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          'react-native-reanimated/plugin': true,
        },
      ],
    ],
    plugins: [
      [
        'babel-plugin-styled-components',
        {
          displayName: true,
          fileName: false,
          ssr: false,
          transpileTemplateLiterals: true,
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
