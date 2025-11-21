import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { fetchWithoutAuth } from "../src/api";
import { useRouter } from "expo-router";

export default function createUniversity() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [domain, setDomain] = useState("");
    const [description, setDescription] = useState("");
    const [photo, setPhoto] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async () => {
        console.log("Submitting:", { name, domain, description, photo });
        setError("");
        setSuccess("");

        if (!name || !domain) {
            setError("Name and domain are required.");
            return;
        }

        try {
            setLoading(true);

            const res = await fetchWithoutAuth("/universities", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    domain,
                    description,
                    photo,
                }),
            });

            const data = await res.json();
            console.log(data)

            if (!res.ok) {
                setError(data.error || "Failed to create university.");
                return;
            }

            setSuccess("University created successfully!");

            // Reset fields
            setName("");
            setDomain("");
            setDescription("");
            setPhoto("");

        } catch (err) {
            setError("Unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <ScrollView contentContainerStyle={styles.wrapper}>
                <View style={styles.card}>

                    <Text style={styles.title}>Create University</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {success ? <Text style={styles.success}>{success}</Text> : null}

                    <Text style={styles.label}>Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Lebanese American University"
                        placeholderTextColor="#aaa"
                    />

                    <Text style={styles.label}>Domain *</Text>
                    <TextInput
                        style={styles.input}
                        value={domain}
                        onChangeText={setDomain}
                        placeholder="lau.edu.lb"
                        placeholderTextColor="#aaa"
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Description"
                        placeholderTextColor="#aaa"
                        multiline
                    />

                    <Text style={styles.label}>Photo URL</Text>
                    <TextInput
                        style={styles.input}
                        value={photo}
                        onChangeText={setPhoto}
                        placeholder="https://image.jpg"
                        placeholderTextColor="#aaa"
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Create University</Text>
                        )}
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#f5f6fa",
        justifyContent: "center",
    },
    card: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 14,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        backgroundColor: "#fafafa",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#000",
    },
    textarea: {
        height: 100,
        textAlignVertical: "top",
    },
    button: {
        marginTop: 20,
        backgroundColor: "#4facfe",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "700",
    },
    error: {
        backgroundColor: "#ffdada",
        padding: 10,
        borderRadius: 8,
        color: "#a00000",
        textAlign: "center",
    },
    success: {
        backgroundColor: "#d5ffe0",
        padding: 10,
        borderRadius: 8,
        color: "#0d7a2c",
        textAlign: "center",
    },
});
