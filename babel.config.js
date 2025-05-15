module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Remove "expo-router/babel" from plugins if present
    plugins: [
      'react-native-reanimated/plugin',
      // "expo-router/babel", // <-- REMOVE THIS LINE
    ],
  };
};