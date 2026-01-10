import React, { useEffect, useState } from "react";
import { useColorScheme, Platform } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";

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

// Keep splash screen visible until ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const pushToken = usePushToken();

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

    try {
      const raw = pendingNotification.data;
      const parsed = JSON.parse(raw?.[0] || raw);

      router.replace({
        pathname: `/${pendingNotification.screen}`,
        params: parsed.receiverId
          ? {
              userId: parsed.userId,
              receiverId: parsed.receiverId,
              name: parsed.name,
              avatar: parsed.avatar,
            }
          : {
              data:
                parsed._id ||
                parsed.clubid ||
                parsed.offerId,
            },
      });

      // prevent duplicate navigation
      setPendingNotification(null);
    } catch (err) {
      console.log("Failed to handle notification navigation", err);
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
