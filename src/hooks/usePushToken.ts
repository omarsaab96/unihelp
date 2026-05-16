import { useEffect, useState } from "react";
import { getDevicePushToken } from "../pushNotifications";

export default function usePushToken() {
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getDevicePushToken();
      if (!token) return;

      setPushToken(token);
    })();
  }, []);

  return pushToken;
}
