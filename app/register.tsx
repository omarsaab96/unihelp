import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Image,
    Alert,
    TouchableOpacity,
    useColorScheme,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { register, login } from "../src/api";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const router = useRouter();

    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // 👇 Detect keyboard open/close events
    useEffect(() => {
        const showSub = Keyboard.addListener("keyboardDidShow", () =>
            setKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener("keyboardDidHide", () =>
            setKeyboardVisible(false)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleRegister = async () => {
        setLoading(true);
        try {
            const data = await register({ firstname, lastname, email, password });
            if (data.error) {
                Alert.alert("Error", data.error);
            }
            else handleLogin();
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false)
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            if (data.error) Alert.alert("Error", data.error);
            else router.replace("/");
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const styles = styling(colorScheme, insets, keyboardVisible);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.appContainer}
        >
            <Image source={require("../assets/images/logo.png")} style={styles.logo} />
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <Text style={styles.title}>Register</Text>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TextInput
                            placeholder="First Name"
                            value={firstname}
                            onChangeText={(text) => {
                                const capitalized = text
                                    .split(" ")
                                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(" ");
                                setFirstname(capitalized);
                            }}
                            style={[styles.input, { flex: 1 }]}
                            placeholderTextColor={colorScheme === "dark" ? "#888" : "#555"}
                        />

                        <TextInput
                            placeholder="Last Name"
                            value={lastname}
                            onChangeText={(text) => {
                                const capitalized = text
                                    .split(" ")
                                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(" ");
                                setLastname(capitalized);
                            }}
                            style={[styles.input, { flex: 1 }]}
                            placeholderTextColor={colorScheme === "dark" ? "#888" : "#555"}
                        />
                    </View>

                    <TextInput
                        placeholder="University email"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={colorScheme === "dark" ? "#888" : "#555"}
                    />

                    <TextInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                        autoCapitalize="none"
                        placeholderTextColor={colorScheme === "dark" ? "#888" : "#555"}
                    />

                    <TouchableOpacity
                        style={[styles.fullCTA, loading && { opacity: 0.6 }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.fullCTAText}>
                            {loading ? "Registering..." : "Register"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginCTA}
                        onPress={() => router.push("/login")}
                        disabled={loading}
                    >
                        <Text style={[styles.loginText, styles.loginLabel]}>
                            Already have an account?
                        </Text>
                        <Text style={styles.loginText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styling = (colorScheme, insets, keyboardVisible) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
        },
        logo: {
            width: 250,
            height: 40,
            objectFit: 'contain',
            marginBottom: 20,
            marginTop: insets.top + 50,
            alignSelf: 'center'
        },
        scrollContainer: {
            flexGrow: 1,
            justifyContent: "flex-end",
        },
        container: {
            paddingHorizontal: 20,
            gap: 15,
        },
        title: {
            fontSize: 32,
            color: colorScheme === "dark" ? "#fff" : "#000",
            fontFamily: "Manrope_700Bold",
            marginBottom: 30,
        },
        input: {
            borderWidth: 1,
            borderColor: colorScheme === "dark" ? "#444" : "#ccc",
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 30,
            fontSize: 16,
            color: colorScheme === "dark" ? "#fff" : "#000",
            backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
        },
        fullCTA: {
            borderRadius: 25,
            paddingVertical: 15,
            backgroundColor: "#2563EB",
            alignItems: "center",
            marginTop: 10,
        },
        fullCTAText: {
            color: "#fff",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 16,
        },
        loginCTA: {
            marginTop: 20,
            alignItems: "center",
            flexDirection: "row",
            gap: 5,
            justifyContent: "center",
        },
        loginText: {
            color: "#2563EB",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 16,
            marginBottom: keyboardVisible ? 20 : insets.bottom + 40,

        },
        loginLabel: {
            color: colorScheme === "dark" ? "#fff" : "#000",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 16,
        },
    });
