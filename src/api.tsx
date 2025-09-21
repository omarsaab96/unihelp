import * as SecureStore from "expo-secure-store";

const API_URL = "http://10.0.2.2:4000";

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
export const register = async ({ firstname, email, password }) => {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstname, email, password }),
  });
  return res.json();
};

// Login user
export const login = async ({ email, password }) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (res.ok) {
    await saveItem("accessToken", data.accessToken);
    await saveItem("refreshToken", data.refreshToken);

    // Save user info from access token payload
    const userPayload = JSON.parse(atob(data.accessToken.split(".")[1]));
    await saveItem("user", JSON.stringify(userPayload));
  }

  return data;
};

// Logout
export const logout = async () => {

  const refreshToken = await getItem("refreshToken");
  if (refreshToken) {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
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

  const res = await fetch(`${API_URL}/api/users/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};
