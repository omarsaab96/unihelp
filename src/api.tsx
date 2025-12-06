import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';
import { Platform,Alert } from "react-native";

// Grab config from both expoConfig (dev/Expo Go) and manifest (EAS production) to avoid undefined at runtime
const extra =
  (Constants?.expoConfig?.extra as any) ||
  (Constants as any)?.manifest?.extra ||
  {};

  

const API_URL =
  extra.API_URL_LIVE ||
  // Fallbacks for older builds or if live is missing
  extra.API_URL_STAGE ||
  (Platform.OS === "android" ? extra.API_URL_LOCAL_ANDROID : extra.API_URL_LOCAL_IOS);

// Helper functions to store/retrieve
export const saveItem = async (key, value) => {
  await SecureStore.setItemAsync(key, value);
};

export const getItem = async (key) => {
  return await SecureStore.getItemAsync(key);
};

export const deleteItem = async (key) => {
  await SecureStore.deleteItemAsync(key);
};

// Register user
export const register = async ({ firstname, lastname, email, password }) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstname, lastname, email, password }),
  });
  return res.json();
};

// Login user
// export const login = async ({ email, password }) => {
//   console.log('request start', `${API_URL}/auth/login`)

  
//   const res = await fetch(`${API_URL}/auth/login`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ email, password }),
//   });

//   console.log(res)

//   const data = await res.json();
//   console.log(data)

//   if (res.ok) {
//     await saveItem("accessToken", data.accessToken);
//     await saveItem("refreshToken", data.refreshToken);

//     // Save user info from access token payload
//     const userPayload = JSON.parse(atob(data.accessToken.split(".")[1]));
//     await saveItem("user", JSON.stringify(userPayload));
//   }else{
//     console.log('request failed')
//   }

//   return data;
// };
export const login = async ({ email, password }) => {
  try {
    console.log('🔥 request start', `${API_URL}/auth/login`);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log('🔥 response object:', res);

    const text = await res.text();
    console.log('🔥 raw response body:', text);

    return JSON.parse(text);

  } catch (err) {
    console.log('🔥 FULL ERROR OBJECT:', err);
    console.log('🔥 FULL ERROR STRING:', JSON.stringify(err, null, 2));
    throw err;
  }
};

// Logout
export const logout = async () => {

  const refreshToken = await getItem("refreshToken");
  if (refreshToken) {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    });

    if (res.ok) {
      await deleteItem("accessToken");
      await deleteItem("refreshToken");
      await deleteItem("user");
      await deleteItem("userInfo");
    }
  }


};

// Get current user
export const getCurrentUser = async () => {
  const token = await getItem("accessToken");
  if (!token) return null;

  const res = await fetchWithAuth(`/users/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export async function fetchWithAuth(url: string, options: any = {}) {
  let token = await SecureStore.getItemAsync("accessToken");

  if (!options.headers) options.headers = {};
  options.headers["Authorization"] = `Bearer ${token}`;
  options.headers["Content-Type"] = "application/json";

  let res = await fetch(`${API_URL}${url}`, options);

  if (res.status === 403) {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) throw new Error("Not authenticated");

    const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    });

    if (!refreshRes.ok) {
      // Clear invalid tokens
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("user");
      throw new Error("Refresh token invalid");
    }

    const data = await refreshRes.json();
    token = data.accessToken;
    await SecureStore.setItemAsync("accessToken", token);

    // Retry original request
    options.headers["Authorization"] = `Bearer ${token}`;
    res = await fetch(`${API_URL}${url}`, options);
  }

  return res;
}

export async function fetchWithoutAuth(url: string, options: any = {}) {
  // Ensure headers exist
  if (!options.headers) options.headers = {};
  options.headers["Content-Type"] = "application/json";

  // Call API
  const res = await fetch(`${API_URL}${url}`, options);
  return res;
}
