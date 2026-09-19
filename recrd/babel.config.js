module.exports = function (api) {
  api.cache(true);

  return {
    // babel-preset-expo has covered expo-router since SDK 50, so the old
    // 'expo-router/babel' plugin is gone.
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 moved its babel plugin into react-native-worklets.
      // This has to stay last.
      'react-native-worklets/plugin',
    ],
  };
};
