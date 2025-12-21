import React, { useEffect, useState } from "react";
import { useColorScheme, Platform } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { localstorage } from '../utils/localStorage';
import { fetchWithAuth } from "../src/api";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import usePushToken from "../src/hooks/usePushToken";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pushToken = usePushToken();
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // When app is opened from a notification (cold start)
    const checkInitialNotification = async () => {
      const response =
        await Notifications.getLastNotificationResponseAsync();

      if (response) {
        handleNotification(response.notification.request.content.data);
      }
    };

    if (Platform.OS !== "web") checkInitialNotification();

    // When app is already open / backgrounded
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handleNotification(response.notification.request.content.data);
        }
      );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = await localstorage.get("accessToken");
        if (accessToken) {
          const user = await fetchWithAuth(`/users/current`);
          const data = await user.json();

          if (data && !data.error) {
            setIsAuthenticated(true);
          } else {
            console.log("Invalid user data or error:", data);
          }
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

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!pushToken) return; // 🔥 wait until it's ready

    const sendToken = async () => {
      console.log('getting token')
      try {
        const res = await fetchWithAuth("/users/device-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: pushToken }),
        });

        const data = await res.json();
        console.log("push token stored:", data);
      } catch (e) {
        console.log("push token send failed:", e);
      }
    };

    console.log('sending token')
    sendToken();
  }, [isAuthenticated, pushToken]);

  useEffect(() => {
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  const handleNotification = (data: any) => {
    if (!data) return;

    const raw = data.data;
    const parsed = JSON.parse(raw[0] || raw);

    if (data.screen === "chat" && raw) {
      router.push({
        pathname: "/chat",
        params: {
          userId: parsed.userId,
          receiverId: parsed.receiverId,
          name: parsed.name,
          avatar: parsed.avatar
        }
      });
    } else {
      router.push({
        pathname: `/${data.screen}`,
        params: { data: parsed._id || parsed.clubid || parsed.offerId }
      })
    }


  };


  if (loading) {
    // keep splash screen until auth check is done
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="index" options={{ title: "Home" }} />
          ) : (
            <Stack.Screen name="login" options={{ title: "Login" }} />
          )}
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
