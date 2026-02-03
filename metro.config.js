const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for React Native 0.76 TurboModule issues
config.resolver.sourceExts.push('cjs');

module.exports = config;
