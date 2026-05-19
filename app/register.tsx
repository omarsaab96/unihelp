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
import { getCurrentUser, guestLogin, register, login, upgradeGuest, updateCurrentUser } from "../src/api";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../src/i18n";
import { ActivityIndicator } from "react-native-paper";

export default function RegisterScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { t } = useTranslation();

    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [type, setType] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [typeSelectorVisible, setTypeSelectorVisible] = useState(false);
    const [isGuestUpgrade, setIsGuestUpgrade] = useState(false);

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

    useEffect(() => {
        const checkGuest = async () => {
            try {
                const data = await getCurrentUser();
                setIsGuestUpgrade(!!data?.isGuest);
                if (data?.isGuest && data?.firstname?.startsWith("User_")) {
                    setFirstname("");
                }
            } catch {
                setIsGuestUpgrade(false);
            }
        };

        checkGuest();
    }, []);

    const handleRegister = async () => {
        if (firstname.trim() == "" || lastname.trim() == "" || email.trim() == "" || password.trim() == "") {
            Alert.alert(t("common.error"), t("auth.fillAllFields"));
            return;
        }

        if (password.trim().length < 6) {
            Alert.alert(t("common.error"), t("auth.passwordTooShort"));
            return;
        }

        setLoading(true);
        try {
            if (typeSelectorVisible) {
                if (type == "") {
                    Alert.alert(t("common.error"), t("auth.accountType"));
                    return;
                }

                const data = await updateCurrentUser({ role: type });
                if (data.error) Alert.alert(t("common.error"), data.error);
                else await handleLogin();
                return;
            }

            const data = isGuestUpgrade
                ? await upgradeGuest({ firstname, lastname, email, password, type: undefined })
                : await register({ firstname, lastname, email, password, type: undefined });

            if (data.error) {
                Alert.alert(t("common.error"), data.error);
            }
            else {
                if (!isGuestUpgrade) {
                    const loginData = await login({ email, password });
                    if (loginData.error) {
                        Alert.alert(t("common.error"), loginData.error);
                        return;
                    }
                }

                setTypeSelectorVisible(true);
            }
        } catch (err) {
            Alert.alert(t("common.error"), err.message);
        } finally {
            setLoading(false)
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            if (data.error) Alert.alert(t("common.error"), data.error);
            else router.replace("/");
        } catch (err) {
            Alert.alert(t("common.error"), err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            const data = await guestLogin();
            if (data.error) Alert.alert(t("common.error"), data.error);
            else router.replace("/");
        } catch (err) {
            Alert.alert(t("common.error"), err.message);
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
                {!typeSelectorVisible && <View style={styles.container}>
                    <Text style={styles.title}>{isGuestUpgrade ? t("auth.secureAccount") : t("auth.register")}</Text>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TextInput
                            placeholder={t("auth.firstName")}
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
                            placeholder={t("auth.lastName")}
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
                        placeholder={t("auth.universityEmail")}
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={colorScheme === "dark" ? "#888" : "#555"}
                    />

                    <TextInput
                        placeholder={t("auth.password")}
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                        autoCapitalize="none"
                        placeholderTextColor={colorScheme === "dark" ? "#888" : "#555"}
                    />

                    <TouchableOpacity
                        style={[styles.fullCTA, loading && { opacity: 0.6, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center' }, isGuestUpgrade && { marginBottom: keyboardVisible ? 20 : insets.bottom + 40, }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.fullCTAText}>
                            {t("common.next")}
                        </Text>
                        {loading && <ActivityIndicator size='small' color="#fff" />}
                    </TouchableOpacity>

                    {!isGuestUpgrade && <TouchableOpacity
                        style={[styles.loginCTA]}
                        onPress={() => router.push("/login")}
                        disabled={loading}
                    >
                        <Text style={[styles.loginText, styles.loginLabel]}>
                            {t("auth.alreadyAccount")}
                        </Text>
                        <Text style={styles.loginText}>{t("auth.login")}</Text>
                    </TouchableOpacity>}

                    {!isGuestUpgrade && <View style={styles.alternatives}>
                        <View style={styles.alternativesSeperator}></View>
                        <Text style={styles.alternativesText}>{t("common.or")}</Text>
                    </View>}

                    {!isGuestUpgrade && <TouchableOpacity
                        style={[styles.guestCTA, loading && { opacity: 0.6 }]}
                        onPress={handleGuestLogin}
                        disabled={loading}
                    >
                        <Text style={styles.loginText}>{t("auth.continueGuest")}</Text>
                    </TouchableOpacity>}
                </View>}

                {typeSelectorVisible && <View style={styles.container}>
                    <Text style={styles.title}>{t("auth.accountType")}</Text>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TouchableOpacity onPress={() => { setType("student") }} style={[styles.radioButton, type == "student" && styles.radioButtonActive]}>
                            <Image
                                source={require('../assets/images/student.png')}
                                style={{
                                    width: 100,
                                    height: 100,
                                    objectFit: 'contain',
                                    tintColor: colorScheme == 'dark' ? '#fff' : '#000'
                                }}
                            />
                            <Text style={styles.radioText}>{t("auth.student")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setType("staff") }} style={[styles.radioButton, type == "staff" && styles.radioButtonActive]}>
                            <Image
                                source={require('../assets/images/staff.png')}
                                style={{
                                    width: 100,
                                    height: 100,
                                    objectFit: 'contain',
                                    tintColor: colorScheme == 'dark' ? '#fff' : '#000'
                                }}
                            />
                            <Text style={styles.radioText}>{t("auth.staff")}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.fullCTA, loading && { opacity: 0.6 }, isGuestUpgrade && { marginBottom: keyboardVisible ? 20 : insets.bottom + 40 }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.fullCTAText}>
                            {loading ? (isGuestUpgrade ? t("auth.securing") : t("auth.registering")) : (isGuestUpgrade ? t("auth.secureAccount") : t("auth.register"))}
                        </Text>
                    </TouchableOpacity>

                    {!isGuestUpgrade && <TouchableOpacity
                        style={[styles.loginCTA]}
                        onPress={() => router.push("/login")}
                        disabled={true}
                    >

                    </TouchableOpacity>}


                </View>}
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
        radioButton: {
            borderWidth: 1,
            borderColor: colorScheme === "dark" ? "#444" : "#ccc",
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 30,
            fontSize: 16,
            color: colorScheme === "dark" ? "#fff" : "#000",
            backgroundColor: colorScheme === "dark" ? "#1e293b" : "#fff",
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20
        },
        radioButtonActive: {
            backgroundColor: "#2563EB",
        },
        radioText: {
            color: colorScheme === 'dark' ? "#fff" : "#000",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 16,
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

        },
        loginLabel: {
            color: colorScheme === "dark" ? "#fff" : "#000",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 16,
        },
        guestCTA: {
            alignItems: "center",
            marginBottom: keyboardVisible ? 20 : insets.bottom + 40,
        },
        guestText: {
            color: colorScheme === "dark" ? "#fff" : "#111827",
            fontFamily: "Manrope_600SemiBold",
            fontSize: 15,
            textDecorationLine: "underline",
        },
        alternatives: {
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center'
        },
        alternativesSeperator: {
            position: 'absolute',
            top: 10,
            width: '100%',
            height: 1,
            backgroundColor: colorScheme === 'dark' ? '#444' : '#ccc',
        },
        alternativesText: {
            textAlign: 'center',
            color: colorScheme === 'dark' ? '#444' : '#aaa',
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
            paddingHorizontal: 5,
        }
    });
