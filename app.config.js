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
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "app.omarsaab96.unihelp",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
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
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
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
      "API_URL_LIVE": "http://193.187.132.170:4000/api",
      "CHAT_SERVER_URL": "http://193.187.132.170:4000",
      "eas": {
        "projectId": "deee1163-e217-4c52-93e0-46487e4219f9"
      }
    }
  }
};