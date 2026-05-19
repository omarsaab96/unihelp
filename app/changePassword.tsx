import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { localstorage } from '../utils/localStorage';
import React, { useEffect, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    useColorScheme
} from 'react-native';
import { getCurrentUser, fetchWithoutAuth, logout, fetchWithAuth } from "../src/api";
import { useTranslation } from '../src/i18n';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function ChangePassword() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const scrollRef = useRef<ScrollView>(null);

    let colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);

    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [oldPassword, setOldPassword] = useState("");
    const [oldPasswordVerified, setOldPasswordVerified] = useState(false);
    const [checkingCurrentPassword, setCheckingCurrentPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [newPassword2, setNewPassword2] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewPassword2, setShowNewPassword2] = useState(false);

    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const data = await getCurrentUser();
                if (data.error) {
                    console.error("Error", data.error);
                } else {
                    await localstorage.set('user', JSON.stringify(data))
                    setUser(data)
                }

            } catch (err) {
                console.error("Error", err.message);
            }
        }
        getUserInfo()
    }, []);

    const handleCancel = () => {
        router.back();
    }

    const isValidPassword = (password: string) => {
        if (password.trim().length < 6) {
            return false;
        }
        return true;
    };

    const handleNext = async () => {

        if (oldPassword.trim() == "") {
            setError(t("changePassword.enterCurrentPassword"));
            return;
        }

        if (!isValidPassword(oldPassword)) {
            setError(t("changePassword.passwordMinLength"));
            return;
        }

        setCheckingCurrentPassword(true)
        try {
            const response = await fetchWithAuth(`/users/checkpassword`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    password: oldPassword
                })
            });

            const resp = await response.json();

            // console.log(resp)

            if (response.ok && resp.success) {
                setOldPasswordVerified(true)
                setError(null)
            } else {
                setOldPasswordVerified(false)
                setError(t("changePassword.currentPasswordWrong"));
            }
        } catch (error) {
            setOldPasswordVerified(false);
            Alert.alert(t("common.error"), t("changePassword.somethingWrong"));
        } finally {
            setCheckingCurrentPassword(false);
        }
    }

    const handleSave = async () => {

        if (newPassword != newPassword2) {
            setError(t("changePassword.passwordsNoMatch"));
            return;
        }

        if (oldPassword == newPassword) {
            setError(t("changePassword.sameAsOldPassword"));
            return;
        }

        if (!isValidPassword(newPassword)) {
            setError(t("changePassword.passwordMinLength"));
            return;
        }

        setSaving(true)

        const response = await fetchWithAuth(`/users/updatePassword`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                password: newPassword
            })
        });

        if (response.ok) {
            console.log("Profile updated successfully");
            router.back();
        } else {
            console.error("Failed to update profile");
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.appContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <View style={[styles.header, styles.container]}>
                <View style={styles.paddedHeader}>
                    <TouchableOpacity
                        style={[styles.row, { alignItems: 'baseline', gap: 10 }]}
                        onPress={() => { router.back() }}
                    >
                        <Ionicons name="chevron-back"
                            size={24}
                            color="#fff"
                            style={{ transform: [{ translateY: 0 }] }}
                        />
                        <Text style={styles.pageTitle}>{t("changePassword.title")}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {user && <ScrollView ref={scrollRef} style={styles.scrollArea} contentContainerStyle={{
                justifyContent: 'space-between',
                flex: 1
            }}>

                {!oldPasswordVerified && <View style={{}}>
                    {error != null && <View style={styles.error}>
                        <View style={styles.errorIcon}>
                            <MaterialIcons name="error-outline" size={20} color={colorScheme === 'dark' ? '#bb0a0a' : 'red'} />
                        </View>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>}
                    <View>
                        <TextInput
                            placeholder={t("changePassword.currentPassword")}
                            value={oldPassword}
                            onChangeText={setOldPassword}
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
                </View>}

                {oldPasswordVerified && <View style={{ gap: 10 }}>
                    {error != null && <View style={styles.error}>
                        <View style={styles.errorIcon}>
                            <MaterialIcons name="error-outline" size={20} color={colorScheme === 'dark' ? '#bb0a0a' : 'red'} />
                        </View>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>}
                    <View>
                        <TextInput
                            placeholder={t("changePassword.newPassword")}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            style={styles.input}
                            secureTextEntry={!showNewPassword}
                            autoCapitalize="none"
                            placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                        />
                        <TouchableOpacity
                            onPress={() => setShowNewPassword(!showNewPassword)}
                            style={styles.eyeIcon}
                        >
                            <MaterialIcons
                                name={showNewPassword ? "visibility-off" : "visibility"}
                                size={24}
                                color="#707070"
                            />
                        </TouchableOpacity>
                    </View>
                    <View>
                        <TextInput
                            placeholder={t("changePassword.repeatNewPassword")}
                            value={newPassword2}
                            onChangeText={setNewPassword2}
                            style={styles.input}
                            secureTextEntry={!showNewPassword2}
                            autoCapitalize="none"
                            placeholderTextColor={colorScheme === 'dark' ? '#888' : '#555'}
                        />
                        <TouchableOpacity
                            onPress={() => setShowNewPassword2(!showNewPassword2)}
                            style={styles.eyeIcon}
                        >
                            <MaterialIcons
                                name={showNewPassword2 ? "visibility-off" : "visibility"}
                                size={24}
                                color="#707070"
                            />
                        </TouchableOpacity>
                    </View>
                </View>}

                {!oldPasswordVerified && <View style={{ justifyContent: 'space-between' }}>
                    <View style={[styles.profileActions]}>
                        <TouchableOpacity
                            onPress={() => { handleNext() }}
                            style={[styles.profileButton, styles.savebtn]}
                            disabled={checkingCurrentPassword}
                        >
                            <Text style={styles.profileButtonText}>
                                {!checkingCurrentPassword && t("common.next")}
                            </Text>
                            {checkingCurrentPassword && (
                                <ActivityIndicator
                                    size="small"
                                    color="#ffffff"
                                />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { handleCancel() }} style={styles.profileButton}>
                            <Text style={styles.profileButtonText}>{t("common.cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>}

                {oldPasswordVerified && <View style={{ gap: 10, justifyContent: 'space-between' }}>
                    <View style={[styles.profileActions]}>
                        <TouchableOpacity onPress={() => { handleSave() }} style={[styles.profileButton, styles.savebtn]}>
                            <Text style={styles.profileButtonText}>
                                {saving ? t("changePassword.saving") : t("common.save")}
                            </Text>
                            {saving && (
                                <ActivityIndicator
                                    size="small"
                                    color="#ffffff"
                                    style={styles.saveLoaderContainer}
                                />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { handleCancel() }} style={styles.profileButton}>
                            <Text style={styles.profileButtonText}>{t("common.cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>}
            </ScrollView>
            }


        </KeyboardAvoidingView>
    );
}

const styling = (colorScheme: string, insets: any) =>
    StyleSheet.create({

        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
            paddingBottom: insets.bottom + 10,
        },
        container: {
            paddingHorizontal: 20,
        },
        statusBar: {
            backgroundColor: '#2563EB',
            height: Platform.OS === 'ios' ? 60 : 25,
            zIndex: 1
        },
        header: {
            marginBottom: 10,
            backgroundColor: colorScheme === 'dark' ? '#2563EB' : '#2563EB',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
            zIndex: 1
        },
        scrollArea: {
            flex: 1,
            paddingHorizontal: 20,
            // borderWidth: 1,
        },
        paddedHeader: {
            paddingTop: 20,
            // marginBottom: 20
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        error: {
            marginBottom: 15,
            backgroundColor: colorScheme === 'dark' ? '#f65d5d' : '#fce3e3',
            padding:5,
            paddingRight: 15,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap:5
        },
        errorIcon: {
        },
        errorText: {
            color: colorScheme === 'dark' ? '#bb0a0a' : 'red',
            fontSize: 14,
            lineHeight: 20
        },
        pageHeader: {
            backgroundColor: '#FF4000',
            height: 270,
            // marginBottom: 30
        },
        logo: {
            width: 120,
            height: 30,
            position: 'absolute',
            top: 30,
            left: 20,
            zIndex: 1,
        },
        headerTextBlock: {
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: width - 40,
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
            marginBottom: 30
        },
        pageDesc: {
            color: '#ffffff',
            fontSize: 16,
            fontFamily: 'Acumin'
        },
        entity: {
            marginBottom: 20
        },
        title: {
            fontFamily: "Qatar",
            fontSize: 16,
            color: 'black'
        },
        subtitle: {
            fontFamily: "Acumin",
            fontSize: 16,
            // fontWeight: 600,
            width: '100%',
            textTransform: 'capitalize',
            color: 'black'
        },
        paragraph: {
            fontFamily: "Acumin",
            fontSize: 16,
            color: 'black'
        },
        ghostText: {
            color: '#ffffff',
            fontSize: 100, textTransform: 'uppercase',
            fontFamily: 'Qatar',
            position: 'absolute',
            bottom: 20,
            right: -5,
            opacity: 0.2
        },
        profileImage: {
            position: 'absolute',
            bottom: 0,
            right: -5,
            height: '70%',
            maxWidth: 200,
            overflow: 'hidden',
        },
        profileImageAvatar: {
            height: '100%',
            width: undefined,
            aspectRatio: 1,
            resizeMode: 'contain',
        },
        profileActions: {
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.2)',
            paddingTop: 10,
            gap: 10
        },
        inlineActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            columnGap: 15
        },
        profileButton: {
            // borderRadius: 5,
            // padding: 5,
            // paddingHorizontal: 10,
            // backgroundColor: 'rgba(0,0,0,0.05)',
            // marginBottom: 10
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            // backgroundColor: '#2563eb',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 60,
            // marginBottom: 12,
            // marginTop: 10
        },
        savebtn: {
            gap: 10,
            backgroundColor: '#3d78f8',
            marginBottom: 0,
        },
        profileButtonText: {
            color: '#fff',
            fontSize: 16,
            fontFamily: 'Manrope_700Bold'
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
        eyeIcon: {
            position: 'absolute',
            right: 15,
            top: 15,
            zIndex: 1,
        },
        saveLoaderContainer: {
            marginLeft: 10
        },
        phoneContainer: {
            flexDirection: 'row',
            alignItems: 'stretch',
            width: '100%',
            marginBottom: 16,
            backgroundColor: '#F4F4F4',
            borderRadius: 10,
            paddingHorizontal: 15,
            paddingVertical: 12,
            gap: 5
        },
        phonePicker: {
            justifyContent: 'center',
            fontSize: 16
        },
        phoneInput: {
            marginBottom: 0,
            backgroundColor: 'transparent',
            flex: 1,
            padding: 0,
            fontSize: 16,
            lineHeight: Platform.OS == 'ios' ? 17 : 16,
        },
        verifiedbadge: {
            color: '#009933',
        },
        otpInput: {
            borderWidth: 1,
            aspectRatio: 0.76,
            flex: 1,
            textAlign: "center",
            fontSize: 40,
            borderRadius: 10,
            marginHorizontal: 5,
        },
        backBtn: {
            position: 'absolute',
            top: 60,
            left: 10,
            width: 200,
            zIndex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        backBtnText: {
            color: '#FFF',
            fontSize: 18,
            fontFamily: 'Qatar'
        },
        statNumber: {
            fontSize: 44,
            fontFamily: 'Qatar',
            color: '#FF4000',
            textAlign: 'center',
            flex: 1
        },
        faqQuestion: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
    });
