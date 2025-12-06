import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { fetchWithAuth } from "../src/api";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import usePushToken from "../src/hooks/usePushToken";


// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    const initAuth = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync("accessToken");
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
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
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
