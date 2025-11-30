import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Platform, KeyboardAvoidingView, Keyboard, StyleSheet, Alert, Image, TouchableOpacity, useColorScheme } from "react-native";
import { login } from "../src/api";
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const colorScheme = useColorScheme();
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const styles = styling(colorScheme, insets, keyboardVisible);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            if (data.error) {
                Alert.alert("Error", data.error);
            } else {
                router.replace("/");
            }
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.appContainer}
        >
            <Image source={require("../assets/images/logo.png")} style={styles.logo} />

            {/* <TouchableOpacity onPress={()=>{router.push('/createUniversity')}}>
                <Text style={{color:colorScheme==='dark'?'white':'black'}}>create university</Text>
            </TouchableOpacity> */}

            <View style={{}}>
                <View style={styles.container}>
                    <Text style={styles.title}>Login</Text>

                    <TextInput
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                    />
                    <View>
                        <TextInput
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            style={styles.input}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <MaterialIcons
                                name={showPassword ? "visibility-off" : "visibility"}
                                size={24}
                                color="#707070"
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.forgotPassword} onPress={() => { router.push('/forgotPassword') }}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.fullCTA, loading && { opacity: 0.6 }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.fullCTAText}>{loading ? "Logging in..." : "Login"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.registerCTA, loading && { opacity: 0.6 }]}
                        onPress={() => router.push('/register')}
                        disabled={loading}
                    >
                        <Text style={[styles.registerText, styles.registerLabel]}>Don't have an account?</Text>
                        <Text style={styles.registerText}>Register</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styling = (colorScheme, insets, keyboardVisible) =>
    StyleSheet.create({
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
            justifyContent: 'space-between',
        },
        logo: {
            width: 250,
            height: 40,
            objectFit: 'contain',
            marginBottom: 20,
            marginTop: insets.top + 50,
            alignSelf: 'center'
        },
        container: {
            paddingHorizontal: 20,
            gap: 15,
        },
        title: {
            fontSize: 32,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold',
            marginBottom: 30,
        },
        input: {
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 30,
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#fff',
        },
        forgotPassword: {
            marginTop: 10,
        },
        forgotPasswordText: {
            alignSelf: 'flex-end',
            color: '#2563EB',
            textDecorationLine: 'underline'
        },
        eyeIcon: {
            position: 'absolute',
            right: 15,
            top: 15,
            zIndex: 1,
        },
        fullCTA: {
            borderRadius: 25,
            paddingVertical: 15,
            paddingHorizontal: 10,
            backgroundColor: '#2563EB',
            alignItems: 'center',
            marginTop: 10,
        },
        fullCTAText: {
            color: '#fff',
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 16,
        },
        registerCTA: {
            marginTop: 10,
            alignItems: 'center',
            flexDirection: 'row',
            gap: 5,
            justifyContent: 'center',
            marginBottom: keyboardVisible ? 20 : insets.bottom + 40,
        },
        registerText: {
            color: colorScheme === 'dark' ? '#2563EB' : '#2563EB',
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 16,
        },
        registerLabel: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 16,
        }
    });
