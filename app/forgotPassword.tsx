import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from "expo-clipboard";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    Image,
    useColorScheme
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchWithoutAuth } from "../src/api";


const { width } = Dimensions.get("window");

export default function ForgotPassword() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const styles = styling(colorScheme, insets, keyboardVisible);

    const router = useRouter();
    const [userEmail, setUserEmail] = useState("");
    const [error, setError] = useState(null);

    const [checkingEmail, setCheckingEmail] = useState(false);
    const [checkedEmail, setCheckedEmail] = useState(false);
    const [checkedEmailIsVerified, setCheckedEmailIsVerified] = useState(false);

    const [emailOTPSent, setEmailOTPSent] = useState(false);
    const [verifyingEmailOTP, setVerifyingEmailOTP] = useState(false);
    const [saving, setSaving] = useState(false);

    const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
    const emailInputsRef = useRef([]);

    const [secondsLeft, setSecondsLeft] = useState(0);
    const timerRef = useRef(null);

    const [newPassword, setNewPassword] = useState("");
    const [newPassword2, setNewPassword2] = useState("");

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

    // --------------------------
    // ALL YOUR LOGIC REMAINS SAME
    // --------------------------

    const isValidEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

    const startCountdown = (duration = 60) => {
        clearInterval(timerRef.current);
        setSecondsLeft(duration);

        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleChange = (text, index) => {
        let newOtp = [...emailOtp];
        newOtp[index] = text.slice(-1);
        setEmailOtp(newOtp);
        if (text && index < 5) emailInputsRef.current[index + 1]?.focus();
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === "Backspace" && !emailOtp[index] && index > 0) {
            emailInputsRef.current[index - 1]?.focus();
        }
    };

    const pasteEmailOTP = async () => {
        const pasteData = (await Clipboard.getStringAsync()).trim();
        if (!/^\d+$/.test(pasteData)) return;
        const digits = pasteData.split("").slice(0, 6);
        let newOtp = [...emailOtp];
        digits.forEach((d, i) => (newOtp[i] = d));
        setEmailOtp(newOtp);
    };

    const handleNext = async () => {
        if (!isValidEmail(userEmail)) {
            Alert.alert("Please enter a valid email address");
            return;
        }

        setCheckingEmail(true);
        try {
            const res = await fetchWithoutAuth(`/users/check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail }),
            });

            const data = await res.json();

            if (res.ok && !data.success && data.msg === "Email already exists") {
                setCheckedEmail(true);
                handleSendEmailOTP();
            } else {
                setCheckedEmail(false);
                Alert.alert("No account found.", "This email is not registered");
            }
        } catch (err) {
            setCheckedEmail(false);
            Alert.alert("Something went wrong");
        } finally {
            setCheckingEmail(false);
        }
    };

    const handleSendEmailOTP = async () => {
        const res = await fetch(`http://:5000/api/verify/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
        });

        const data = await res.json();

        if (data.result === "success") {
            setEmailOTPSent(true);
            SecureStore.setItem("emailOTPToken", data.verificationToken);
            emailInputsRef.current[0]?.focus();
            startCountdown();
        } else {
            Alert.alert("Failed to send OTP");
        }
    };

    const handleVerifyEmailOTP = async () => {
        setVerifyingEmailOTP(true);

        const token = await SecureStore.getItemAsync("emailOTPToken");

        const res = await fetch(`/api/verify/emailOtp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                otp: emailOtp.join(""),
                verificationToken: token,
            }),
        });

        const data = await res.json();

        if (data.result === "success") {
            setCheckedEmailIsVerified(true);
            setEmailOTPSent(false);
        } else {
            Alert.alert(data.error || "Invalid code");
        }

        setVerifyingEmailOTP(false);
    };

    const handleSave = async () => {
        if (newPassword !== newPassword2) {
            Alert.alert("Passwords do not match");
            return;
        }

        setSaving(true);

        const res = await fetch(
            `h0/api/users/resetPassword`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, password: newPassword }),
            }
        );

        if (res.ok) {
            router.replace("/login");
        } else {
            setSaving(false);
            Alert.alert("Failed to update password");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.appContainer}
        >
            <Image source={require("../assets/images/logo.png")} style={styles.logo} />


            <View style={{}}>
                <View style={styles.container}>
                    <Text style={styles.title}>Forgot password?</Text>

                    <Text style={styles.subtitle}>
                        {/* Reset your account's password */}
                    </Text>

                    {!checkedEmail && (
                        <>
                            <TextInput
                                placeholder="Email"
                                value={userEmail}
                                onChangeText={setUserEmail}
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                            />

                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={handleNext}
                                disabled={checkingEmail}
                            >
                                {checkingEmail ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.applyButtonText}>Next</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* OTP STEP */}
                    {checkedEmail && emailOTPSent && !checkedEmailIsVerified && (
                        <>
                            <Text style={styles.subtitle}>Enter the code we sent you</Text>

                            <View style={styles.otpRow}>
                                {emailOtp.map((digit, i) => (
                                    <TextInput
                                        key={i}
                                        ref={(r) => (emailInputsRef.current[i] = r)}
                                        value={digit}
                                        onChangeText={(t) => handleChange(t, i)}
                                        onKeyPress={(e) => handleKeyPress(e, i)}
                                        maxLength={1}
                                        keyboardType="number-pad"
                                        style={styles.otpInput}
                                    />
                                ))}
                            </View>

                            {secondsLeft > 0 ? (
                                <Text style={styles.resendDisabled}>
                                    Resend code in {secondsLeft}s
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleSendEmailOTP}>
                                    <Text style={styles.resend}>Resend code</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={handleVerifyEmailOTP}
                                disabled={verifyingEmailOTP}
                            >
                                {verifyingEmailOTP ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.applyButtonText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* NEW PASSWORD STEP */}
                    {checkedEmail && checkedEmailIsVerified && (
                        <>
                            <TextInput
                                placeholder="New password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                style={styles.input}
                                autoCapitalize="none"
                                secureTextEntry
                                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                            />

                            <TextInput
                                placeholder="Repeat new password"
                                value={newPassword2}
                                onChangeText={setNewPassword2}
                                style={styles.input}
                                autoCapitalize="none"
                                secureTextEntry
                                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                            />

                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.applyButtonText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
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

        container: {
            paddingHorizontal: 20,
            gap: 15,
        },

        logo: {
            width: 250,
            height: 40,
            objectFit: 'contain',
            marginBottom: 20,
            marginTop: insets.top + 50,
            alignSelf: 'center'
        },

        title: {
            fontSize: 32,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold',
        },

        subtitle: {
            fontSize: 18,
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

        errorText: {
            backgroundColor: "#fce3e3",
            borderRadius: 10,
            padding: 10,
            color: "red",
        },

        applyButton: {
            backgroundColor: "#2563EB",
            paddingVertical: 15,
            borderRadius: 30,
            alignItems: "center",
            marginBottom: keyboardVisible ? 20 : insets.bottom + 40,
        },

        applyButtonText: {
            color: "#fff",
            fontSize: 16,
            fontFamily: "Manrope_600SemiBold",
        },

        otpRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginVertical: 20,
        },

        otpInput: {
            borderWidth: 1,
            borderColor: "#ccc",
            width: (width - 100) / 6,
            height: 55,
            fontSize: 26,
            textAlign: "center",
            borderRadius: 10,
        },

        resend: {
            color: "#2563EB",
            textAlign: "center",
            marginBottom: 10,
        },

        resendDisabled: {
            color: "#999",
            textAlign: "center",
            marginBottom: 10,
        },
    });