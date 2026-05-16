import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const extra =
  (Constants?.expoConfig?.extra as any) ||
  (Constants as any)?.manifest?.extra ||
  {};

const projectId = extra?.eas?.projectId;

export async function getDevicePushToken() {
  if (Platform.OS === "web") return null;

  if (!Device.isDevice) {
    console.log("Must use physical device for push notifications");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token permissions");
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log("Device push token:", token);
    return token;
  } catch (err) {
    console.log("Failed to get device push token:", err);
    return null;
  }
}
