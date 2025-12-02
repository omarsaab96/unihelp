import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

export default function usePushToken() {
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    (async () => {
      if (!Device.isDevice) {
        console.log("Must use physical device for push notifications");
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token permissions");
        return;
      }

      // Get token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("📲 Device push token:", token);
      setPushToken(token);
    })();
  }, []);

  return pushToken;
}
