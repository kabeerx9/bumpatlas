const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const asyncStorageShim = path.resolve(
  projectRoot,
  "lib/storage/async-storage-memory.js",
);

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "@react-native-async-storage/async-storage" ||
    moduleName.startsWith("@react-native-async-storage/async-storage/")
  ) {
    // Native AsyncStorage is null in the current Android binary and crashes
    // route evaluation. Shim keeps Expo/Clerk bootable for UI testing.
    return {
      filePath: asyncStorageShim,
      type: "sourceFile",
    };
  }

  if (typeof previousResolveRequest === "function") {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
