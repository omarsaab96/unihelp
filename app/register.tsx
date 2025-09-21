import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { register,login } from "../src/api";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
    const [firstname, setFirstname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter(); // instead of navigation prop

    const handleRegister = async () => {
        setLoading(true);
        try {
            const data = await register({ firstname, email, password });

            if (data.error) {
                Alert.alert("Error", data.error);
            } else {
                handleLogin();
            }
        } catch (err) {
            Alert.alert("Error", err.message);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            if (data.error) {
                Alert.alert("Error", data.error);
            } else {
                router.replace("/")
            }
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Register</Text>
            <TextInput placeholder="First Name" value={firstname} onChangeText={setFirstname} style={styles.input} />
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
            <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
            <Button title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: "center" },
    title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
    input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 15, borderRadius: 5 },
});
