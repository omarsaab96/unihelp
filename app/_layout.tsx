import React, { useEffect, useState, useRef } from "react";
import { useColorScheme, Platform, AppState } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { getActiveChat } from "../src/state/activeChat";

import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";

import { localstorage } from "../utils/localStorage";
import { fetchWithAuth } from "../src/api";
import usePushToken from "../src/hooks/usePushToken";
import { buildNotificationRoute } from "../utils/notificationNavigation";

// Keep splash screen visible until ready
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    if (data?.screen === "chat") {
      let payload = data.data;

      if (typeof payload === "string") {
        payload = JSON.parse(payload);
      }

      const activeChatReceiverId = getActiveChat();

      // 🔕 Suppress only if user is already in THIS chat
      if (
        activeChatReceiverId &&
        payload?.receiverId === activeChatReceiverId
      ) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
    }

    // ✅ MUST use these exact keys
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const pushToken = usePushToken();
  const navigationHandled = useRef(false);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔥 Store notification until app is ready
  const [pendingNotification, setPendingNotification] = useState<any>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        navigationHandled.current = false;
      }
    });

    return () => sub.remove();
  }, []);


  /* ------------------------------------------------------------------ */
  /* Notifications (cold start + foreground/background)                  */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Cold start
    const checkInitialNotification = async () => {
      const response =
        await Notifications.getLastNotificationResponseAsync();
      if (response) {
        setPendingNotification(
          response.notification.request.content.data
        );
      }
    };

    checkInitialNotification();

    // App open / background
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          setPendingNotification(
            response.notification.request.content.data
          );
        }
      );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("📩 FOREGROUND notification received:", notification.request.content.data);
      }
    );

    return () => sub.remove();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Auth check                                                          */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = await localstorage.get("accessToken");
        if (!accessToken) {
          setIsAuthenticated(false);
          return;
        }

        const res = await fetchWithAuth("/users/current");
        const data = await res.json();

        if (data && !data.error) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          await localstorage.remove("accessToken");
          await localstorage.remove("refreshToken");
        }
      } catch (err) {
        console.log("Auth check failed:", err);
        await localstorage.remove("accessToken");
        await localstorage.remove("refreshToken");
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Push token sync                                                     */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!pushToken) return;

    const sendToken = async () => {
      try {
        await fetchWithAuth("/users/device-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: pushToken }),
        });
      } catch (e) {
        console.log("Push token send failed:", e);
      }
    };

    sendToken();
  }, [isAuthenticated, pushToken]);

  /* ------------------------------------------------------------------ */
  /* Handle pending notification ONLY when app is ready                  */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!pendingNotification) return;
    if (loading) return;
    if (!fontsLoaded) return;
    if (navigationHandled.current) return;

    navigationHandled.current = true;

    try {
      const screen = pendingNotification.screen;
      let payload = pendingNotification.data;

      if (typeof payload === "string") payload = JSON.parse(payload);
      if (Array.isArray(payload)) payload = JSON.parse(payload[0]);

      console.log("going to ", screen)

      const route = buildNotificationRoute(screen, payload);

      router.replace(route);


      setPendingNotification(null);
      navigationHandled.current = false; // 🔥 RESET
    } catch (err) {
      console.log("❌ Failed to handle notification navigation", err);
      navigationHandled.current = false;
    }
  }, [pendingNotification, loading, fontsLoaded]);



  /* ------------------------------------------------------------------ */
  /* Splash screen                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  if (loading) {
    // keep splash visible
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="index" />
          ) : (
            <Stack.Screen name="login" />
          )}
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
