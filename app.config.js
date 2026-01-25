module.exports = {
  "expo": {
    "name": "uniHelp",
    "slug": "uniHelp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "unihelp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "updates": {
      "url": "https://u.expo.dev/deee1163-e217-4c52-93e0-46487e4219f9",
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "app.omarsaab96.unihelp",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        },
        "NSCameraUsageDescription": "Allow uniHelp to access your camera to send photos in chat.",
        "NSMicrophoneUsageDescription": "Allow uniHelp to record voice messages in chat.",
        "NSPhotoLibraryUsageDescription": "Allow uniHelp to access your photo library to send images."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "package": "com.omarsaab96.uniHelp",
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON,
      "usesCleartextTraffic": true,
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_AUDIO",
        "READ_MEDIA_VIDEO"
      ],
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "uni-help.app",
              "pathPrefix": "/"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-build-properties",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "expo-font",
      "expo-secure-store",
      "expo-web-browser"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "extra": {
      "API_URL_LOCAL_ANDROID": "http://10.0.2.2:4000/api",
      "API_URL_LOCAL_IOS": "http://192.168.2.205:4000/api",
      "API_URL_STAGE": "https://unihelp-jn38.onrender.com/api",
      "API_URL_LIVE": "https://server.uni-help.app/api",
      "CHAT_SERVER_URL": "https://server.uni-help.app",
      "eas": {
        "projectId": "deee1163-e217-4c52-93e0-46487e4219f9"
      }
    }
  }
};
