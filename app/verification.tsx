import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from "@react-navigation/native";
import Octicons from '@expo/vector-icons/Octicons';
import * as Clipboard from "expo-clipboard";
import { useRouter } from 'expo-router';
import { localstorage } from '../utils/localStorage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
    ActivityIndicator,
    Dimensions,
    useColorScheme,
    Image,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { getCurrentUser, fetchWithAuth } from "../src/api";
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');

export default function VerificationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    let colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);

    const [userId, setUserId] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countryCode, setCountryCode] = useState<any>("EG");
    const [callingCode, setCallingCode] = useState<any>(20);
    const [emailAddress, setEmailAddress] = useState("");
    const [phoneNumber, setPhoneNumber] = useState<any>(null);

    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [verifyingPhone, setVerifyingPhone] = useState(false);

    const [emailOTPSent, setEmailOTPSent] = useState(false);
    const [phoneOTPSent, setPhoneOTPSent] = useState(false);

    const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
    const [phoneOtp, setPhoneOtp] = useState(["", "", "", "", "", ""]);

    const [secondsLeft, setSecondsLeft] = useState(0);
    const timerRef = useRef(null);
    const emailInputsRef = useRef([]);
    const phoneInputsRef = useRef([]);

    useFocusEffect(
        useCallback(() => {
            getUserInfo()
        }, [])
    );

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

    // Auto-verify when email OTP is complete
    useEffect(() => {
        if (emailOTPSent && emailOtp.join("").length === 6) {
            emailInputsRef.current.forEach(ref => ref?.blur());
            handleVerifyEmailOTP();
        }
    }, [emailOtp]);

    // Auto-verify when phone OTP is complete
    useEffect(() => {
        if (phoneOTPSent && phoneOtp.join("").length === 6) {
            phoneInputsRef.current.forEach(ref => ref?.blur());
            handleVerifyPhoneOTP();
        }
    }, [phoneOtp]);

    const isValidEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.toLowerCase());
    };

    const startCountdown = (duration = 60) => {
        clearInterval(timerRef.current); // clear any existing timer
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

    const handleChange = (text: string, index: number, refType: 'email' | 'phone') => {
        let newOtp = refType === 'email' ? [...emailOtp] : [...phoneOtp];
        const currentRef = refType === 'email' ? emailInputsRef : phoneInputsRef;

        newOtp[index] = text.slice(-1); // only last char

        refType === 'email' ? setEmailOtp(newOtp) : setPhoneOtp(newOtp);

        // Move to next input if text entered
        if (text && index < 5) {
            currentRef.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number, refType: 'email' | 'phone') => {
        const currentRef = refType === 'email' ? emailInputsRef : phoneInputsRef;
        let otp = refType === 'email' ? emailOtp : phoneOtp;

        if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
            currentRef.current[index - 1]?.focus();
        }
    };

    const onChangeEmail = () => {
        setEmailOtp(["", "", "", "", "", ""]);
        emailInputsRef.current.forEach(ref => ref?.blur());
        setEmailOTPSent(false);
        setVerifyingEmail(false);
    }

    const onChangePhone = () => {
        setPhoneOtp(["", "", "", "", "", ""]);
        phoneInputsRef.current.forEach(ref => ref?.blur());
        setPhoneOTPSent(false);
        setVerifyingPhone(false);
    }

    const pasteEmailOTP = async () => {
        const pasteData = (await Clipboard.getStringAsync()).trim();

        if (!/^\d+$/.test(pasteData)) return; // only digits allowed

        const digits = pasteData.split("").slice(0, 6); // take max 6
        const newOtp = [...emailOtp];

        digits.forEach((digit, i) => {
            newOtp[i] = digit;
        });

        setEmailOtp(newOtp);

    };

    const pastePhoneOTP = async () => {
        console.log('gettinf paste data')
        const pasteData = (await Clipboard.getStringAsync()).trim();
        console.log('pasteData ', pasteData)

        if (!/^\d+$/.test(pasteData)) return;

        const digits = pasteData.split("").slice(0, 6);
        const newOtp = [...phoneOtp];

        digits.forEach((digit, i) => {
            newOtp[i] = digit;
        });

        setPhoneOtp(newOtp);
    };

    //OTP handling
    const handleSendEmailOTP = async () => {
        // validate email
        // if (!isValidEmail(emailAddress)) {
        //     setError("Please enter a valid email address to verify.")
        //     return;
        // }

        setVerifyingEmail(true)
        try {
            const response = await fetchWithAuth(`/verify`, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'email'
                })
            });

            console.log(response)

            const res = await response.json();
            if (res.result == "success") {
                setEmailOTPSent(true)
                setError(null)
                localstorage.set('emailOTPToken', res.verificationToken)
                emailInputsRef.current[0]?.focus();
                startCountdown();
            } else {
                setEmailOTPSent(false)
                console.error(res)
                setError("Failed to send email OTP");
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setVerifyingEmail(false);
        }
    }

    const handleSendPhoneOTP = async () => {
        //validate phone number
        // if (!isValidPhoneNumber(phoneNumber, countryCode)) {
        //     setError("Invalid phone number");
        //     return;
        // }

        setVerifyingPhone(true)
        const token = await localstorage.get('userToken');
        if (!token || !userId) return;

        const response = await fetch(`http://193.187.132.170:5000/api/verify/${userId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'phone'
            })
        });

        const res = await response.json();

        if (res.result == "success") {
            setPhoneOTPSent(true)
            setError(null)
            localstorage.set('phoneOTPToken', res.verificationToken)
            phoneInputsRef.current[0]?.focus();
            startCountdown();
        } else {
            setPhoneOTPSent(false)
            setError("Failed to send phone OTP");
        }

        setVerifyingPhone(false)
    }

    const handleResendEmailOTP = () => {
        handleSendEmailOTP()
        setEmailOtp(["", "", "", "", "", ""]);
        emailInputsRef.current[0]?.focus();
    };

    const handleResendPhoneOTP = () => {
        handleSendPhoneOTP()
        setPhoneOtp(["", "", "", "", "", ""]);
        phoneInputsRef.current[0]?.focus();
    };

    const handleVerifyEmailOTP = async () => {
        setVerifyingEmail(true)
        try {
            const response = await fetchWithAuth(`/verify/otp`, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'email',
                    otp: emailOtp.join(""),
                    verificationToken: localstorage.get("emailOTPToken"),
                })
            });

            console.log(response)

            const res = await response.json();
            if (res.result == "success") {
                setEmailOTPSent(false)
                setError(null)
                setUser({
                    ...user,
                    verified: {
                        email: Date.now(),
                        phone: user.verified?.phone
                    }
                });

                // if (user.verified.phone != null) {
                router.replace('/profile')
                // }
            } else {
                setEmailOTPSent(true)
                console.error(res)
                setError(res.error);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setVerifyingEmail(false);
        }
    };

    const handleVerifyPhoneOTP = async () => {
        setVerifyingPhone(true)
        const token = await localstorage.get('userToken');
        if (!token || !userId) return;

        const response = await fetch(`http://193.187.132.170:5000/api/verify/${userId}/otp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'phone',
                otp: phoneOtp.join(""),
                verificationToken: localstorage.get("phoneOTPToken"),
            })
        });

        const res = await response.json();

        if (res.result == "success") {
            setPhoneOTPSent(false)
            setError(null)
            setUser({
                ...user,
                verified: {
                    email: user.verified?.email,
                    phone: Date.now()
                }
            });
            setTimeout(() => {
                if (user.verified.email != null) {
                    router.replace('/settings')
                }
            }, 1000)
        } else {
            setPhoneOTPSent(true)
            console.error(res)
            setError("Failed to verify phone OTP");
        }

        setVerifyingPhone(false)
    }

    return (
        <View style={styles.appContainer}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.statusBar}></View>

            <View style={[styles.header, styles.container]}>
                <View style={[styles.paddedHeader, { marginBottom: 20 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                        <Text style={styles.pageTitle}>Back to Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View>
                {user && !loading && <ScrollView>
                    <View style={styles.contentContainer}>
                        {error != null && <View style={styles.error}>
                            <View style={styles.errorIcon}></View>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>}

                        {!emailOTPSent && !phoneOTPSent &&
                            <View>
                                <View style={styles.entity}>
                                    <Text style={styles.title}>
                                        Email address
                                    </Text>

                                    {/* {user.verified.email == null &&
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Email"
                                            placeholderTextColor="#A8A8A8"
                                            value={emailAddress}
                                            onChangeText={setEmailAddress}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    } */}

                                    {/* {user.verified.email != null && */}
                                    <Text style={{ paddingBottom: 20, color: colorScheme === 'dark' ? '#fff' : 'black', fontSize: 16 }}>
                                        {user.email}
                                    </Text>

                                    {user.verified.email == null &&
                                        <TouchableOpacity onPress={handleSendEmailOTP} style={[styles.profileButton, styles.savebtn]}>
                                            <Text style={styles.profileButtonText}>
                                                {verifyingEmail ? 'Sending OTP' : 'Send OTP'}
                                            </Text>
                                            {verifyingEmail && (
                                                <ActivityIndicator
                                                    size="small"
                                                    color="#fff"
                                                    style={styles.saveLoaderContainer}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    }

                                    {user.verified.email != null &&
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                            <Octicons name="verified" size={14} color="#009933" />
                                            <Text style={styles.verifiedbadge}>
                                                Verified
                                            </Text>
                                        </View>
                                    }
                                    {/* } */}
                                </View>

                                {false && <View style={styles.entity}>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                        <Text style={styles.title}>
                                            Phone number
                                        </Text>

                                        {user.verified.phone == null &&
                                            <TouchableOpacity onPress={handleSendPhoneOTP} style={[styles.profileButton, styles.savebtn]}>
                                                <Text style={styles.profileButtonText}>
                                                    {verifyingPhone ? 'Sending OTP' : 'Send OTP'}
                                                </Text>
                                                {verifyingPhone && (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={colorScheme === 'dark' ? '#fff' : 'black'}
                                                        style={styles.saveLoaderContainer}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        }

                                        {user.verified.phone != null &&
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <Octicons name="verified" size={14} color="#009933" />
                                                <Text style={styles.verifiedbadge}>
                                                    Verified
                                                </Text>
                                            </View>
                                        }
                                    </View>
                                    {/* {user.verified.phone == null &&
                                        <View style={styles.phoneContainer}>
                                            <View style={styles.phonePicker}>
                                                <CountryPicker
                                                    countryCode={countryCode}
                                                    withFilter
                                                    withFlag
                                                    withCallingCode
                                                    withAlphaFilter
                                                    withCallingCodeButton
                                                    withEmoji={false}
                                                    onSelect={(country) => {
                                                        setCountryCode(country.cca2);
                                                        setCallingCode(country.callingCode[0]);
                                                    }}
                                                    containerButtonStyle={Platform.OS == "ios" ? { marginTop: -5 } : { marginTop: -2 }}
                                                />
                                            </View>
                                            <TextInput
                                                style={[styles.input, styles.phoneInput]}
                                                placeholder="Phone number"
                                                keyboardType="phone-pad"
                                                value={phoneNumber}
                                                onChangeText={setPhoneNumber}
                                            />
                                        </View>
                                    } */}

                                    {/* {user.verified.phone != null && */}
                                    <Text style={{ paddingTop: 5, paddingBottom: 20, color: 'black', fontSize: 16 }}>
                                        {user.phone}
                                    </Text>
                                    {/* } */}
                                </View>}
                            </View>
                        }

                        {emailOTPSent &&
                            <View>
                                <Text style={{ fontFamily: 'Manrope_400Regular', textAlign: 'center', marginBottom: 10, color: colorScheme === 'dark' ? '#fff' : '#000', fontSize: 14 }}>We sent you a code on</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                    <Text style={{ fontFamily: 'Manrope_700Bold', color: colorScheme === 'dark' ? '#fff' : '#000', fontSize: 14 }}>
                                        {user.email}
                                    </Text>
                                    {/* <TouchableOpacity onPress={onChangeEmail} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: "#000", fontSize: 14 }}>(</Text>
                                        <Text style={{ color: "#FF4000", fontSize: 14 }}>Change</Text>
                                        <Text style={{ color: "#000", fontSize: 14 }}>)</Text>
                                    </TouchableOpacity> */}
                                </View>

                                <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: "space-between", marginVertical: 20 }}>
                                    {emailOtp.map((digit, idx) => (
                                        <View style={styles.otpInputContainer} key={idx}>
                                            <TextInput
                                                ref={el => (emailInputsRef.current[idx] = el)}
                                                style={styles.otpInput}
                                                keyboardType="number-pad"
                                                maxLength={1}
                                                value={digit}
                                                onChangeText={text => handleChange(text, idx, 'email')}
                                                onKeyPress={e => handleKeyPress(e, idx, 'email')}
                                            />
                                        </View>
                                    ))}
                                    <TouchableOpacity onPress={() => pasteEmailOTP()} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <MaterialIcons name="content-paste" size={24} color="#2563EB" />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ alignItems: "center", justifyContent: 'space-between', paddingTop: 20 }}>
                                    {secondsLeft > 0 ? (
                                        <Text style={{ color: "#aaa" }}>Get a new code {secondsLeft}s</Text>
                                    ) : (
                                        <TouchableOpacity onPress={handleResendEmailOTP}>
                                            <Text style={{ fontFamily: 'Manrope_400Regular', color: "#2563EB" }}>Get a new code</Text>
                                        </TouchableOpacity>
                                    )}
                                    <View style={[styles.profileActions, styles.inlineActions, { width: '100%', marginTop: 30, }]}>
                                        <TouchableOpacity onPress={handleVerifyEmailOTP} disabled={verifyingEmail} style={[styles.profileButton, { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 0, paddingVertical: 10, paddingHorizontal: 15 }]}>
                                            <Text style={styles.profileButtonText}>
                                                {verifyingEmail ? 'Verifying' : 'Verify'}
                                            </Text>
                                            {verifyingEmail && <ActivityIndicator size="small" color={'#fff'} />}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        }

                        {phoneOTPSent &&
                            <View>
                                <Text style={{ textAlign: 'center', marginBottom: 10, color: 'black', fontSize: 14 }}>We sent you a code on</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                    <Text style={{ fontWeight: 'bold', color: 'black', fontSize: 14 }}>
                                        {'+' + callingCode + phoneNumber}
                                    </Text>
                                    {/* <TouchableOpacity onPress={onChangePhone} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: "#000", fontSize: 14 }}>(</Text>
                                        <Text style={{ color: "#FF4000", fontSize: 14 }}>Change</Text>
                                        <Text style={{ color: "#000", fontSize: 14 }}>)</Text>
                                    </TouchableOpacity> */}
                                </View>

                                <View style={{ flexDirection: "row", alignItems: 'center', justifyContent: "space-between", marginVertical: 20 }}>
                                    {phoneOtp.map((digit, idx) => (
                                        <TextInput
                                            key={idx}
                                            ref={el => (phoneInputsRef.current[idx] = el)}
                                            style={styles.otpInput}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            value={digit}
                                            onChangeText={text => handleChange(text, idx, 'phone')}
                                            onKeyPress={e => handleKeyPress(e, idx, 'phone')}
                                        />
                                    ))}
                                    <TouchableOpacity onPress={() => pastePhoneOTP()} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <MaterialIcons name="content-paste" size={24} color="#FF4000" />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: "center", justifyContent: 'space-between' }}>
                                    {secondsLeft > 0 ? (
                                        <Text style={{ color: "#aaa" }}>Get a new code {secondsLeft}s</Text>
                                    ) : (
                                        <TouchableOpacity onPress={handleResendPhoneOTP}>
                                            <Text style={{ color: "#FF4000" }}>Get a new code OTP</Text>
                                        </TouchableOpacity>
                                    )}
                                    <View style={[styles.profileActions, styles.inlineActions, { paddingTop: 0, borderTopWidth: 0 }]}>
                                        <TouchableOpacity onPress={handleVerifyPhoneOTP} disabled={verifyingPhone} style={[styles.profileButton, { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 0, paddingVertical: 10, paddingHorizontal: 15 }]}>
                                            <Text style={styles.profileButtonText}>
                                                {verifyingPhone ? 'Verifying' : 'Verify'}
                                            </Text>
                                            {verifyingPhone && <ActivityIndicator size="small" color={'black'} />}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        }
                    </View>
                </ScrollView>
                }
            </View >
        </View>
    );
}

const styling = (colorScheme: string, insets: any) =>
    StyleSheet.create({
        contentContainer: {
            padding: 20,
            paddingBottom: 130
        },
        error: {
            marginBottom: 15,
            backgroundColor: '#fce3e3',
            paddingHorizontal: 5,
            paddingVertical: 5,
            borderRadius: 5,
            flexDirection: 'row',
            alignItems: 'flex-start'
        },
        errorIcon: {
            width: 3,
            height: 15,
            backgroundColor: 'red',
            borderRadius: 5,
            marginRight: 10,
            marginTop: 3
        },
        errorText: {
            color: 'red',
            fontFamily: 'Acumin',
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
        pageDesc: {
            color: '#ffffff',
            fontSize: 16,
            fontFamily: 'Acumin'
        },
        entity: {
            marginBottom: 20
        },
        title: {
            fontFamily: "Manrope_600SemiBold",
            fontSize: 20,
            color: colorScheme === 'dark' ? '#fff' : 'black'
        },
        subtitle: {
            fontFamily: "Acumin",
            fontSize: 16,
            // fontWeight: 'bold',
            width: '100%',
            textTransform: 'capitalize',
            color: colorScheme === 'dark' ? '#fff' : 'black'
        },
        paragraph: {
            fontFamily: "Acumin",
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : 'black'
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
            paddingTop: 10
        },
        inlineActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            columnGap: 15
        },
        profileButton: {
            borderRadius: 60,
            padding: 10,
            paddingHorizontal: 10,
            backgroundColor: '#2563EB',
            marginBottom: 10,
            justifyContent: 'center'
        },
        savebtn: {
            flexDirection: 'row'
        },
        profileButtonText: {
            fontSize: 16,
            color: colorScheme === 'dark' ? '#fff' : '#fff',
            fontFamily: 'Manrope_600SemiBold',
        },
        input: {
            fontSize: 14,
            padding: 15,
            backgroundColor: '#F4F4F4',
            marginBottom: 16,
            color: 'black',
            borderRadius: 10
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
        otpInputContainer: {
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#fff' : '#000',
            width: Platform.OS == 'ios' ? 40 : 35,
            height: 50,
            borderRadius: 10,
            marginHorizontal: 5,
            overflow: 'hidden',
            justifyContent: 'center',
            alignContent: 'center'
        },
        otpInput: {
            fontSize: 40,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            lineHeight: 45,
            padding: 0,
            includeFontPadding: false,
            textAlign: 'center',
        },
        backBtn: { flexDirection: "row", alignItems: "baseline", gap: 10 },
        appContainer: {
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#111827' : '#f4f3e9',
        },
        scrollArea: {
            flex: 1
        },
        statusBar: {
            backgroundColor: '#2563EB',
            height: Platform.OS === 'ios' ? 60 : 25
        },
        SafeAreaPaddingBottom: {
            paddingBottom: Platform.OS == 'ios' ? 40 : 55,
        },
        container: {
            paddingHorizontal: 20,
        },
        minimalLogo: {
            width: 50,
            height: 50,
            objectFit: 'contain'
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        between: {
            justifyContent: 'space-between'
        },
        tinyCTA: {
            width: 50,
            height: 50,
            borderWidth: 1,
            borderRadius: 25,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: colorScheme === 'dark' ? '#888' : '#ccc',
        },
        fullCTA: {
            borderRadius: 25,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#2563EB'
        },
        fullCTAText: {
            color: '#fff'
        },
        profileCTA: {
            width: 40,
            height: 40,
            borderWidth: 0,
            overflow: 'hidden'
        },
        navbarCTA: {
            flex: 1
        },
        navBarCTAText: {
            fontSize: 10,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        activeText: {
            color: colorScheme === 'dark' ? '#ffcc00' : '#ff6f00'
        },
        hint: {
            fontSize: 16,
            color: '#2563EB',
        },
        banner: {
            backgroundColor: colorScheme === 'dark' ? '#152446' : '#79d6b7',
            borderRadius: 30,
            // padding: 20,
            maxHeight: 300
        },
        bannerImage: {
            width: '100%',
            height: 'auto',
            aspectRatio: 2.46,
        },
        bannerText: {
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold'
        },
        header: {
            backgroundColor: colorScheme === 'dark' ? '#2563EB' : '#2563EB',
            borderBottomLeftRadius: Platform.OS == 'ios' ? 60 : 30,
            borderBottomRightRadius: Platform.OS == 'ios' ? 60 : 30,
        },
        paddedHeader: {
            paddingTop: 20,
            marginBottom: 20
        },
        greeting: {
            fontSize: 32,
            color: colorScheme === 'dark' ? '#fff' : "#000",
            lineHeight: 36
        },
        stats: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 30,
        },
        stat: {
            width: (width - 50) / 2,
            borderRadius: 30,
            padding: 15,
            backgroundColor: colorScheme === 'dark' ? '#2c3854' : '#e4e4e4',
        },
        statTitle: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000'
        },
        statValue: {
            fontSize: 28,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_700Bold'
        },
        topupBtn: {
        },
        topupIcon: {

        },
        avatar: {
            width: 60,
            height: 60,
            borderRadius: 50,
        },
        name: {
            fontSize: 24,
            color: '#fff',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 24,
            marginBottom: 5,
            textTransform: 'capitalize'
        },
        email: {
            fontSize: 16,
            color: '#d1d5db',
            fontFamily: 'Manrope_400Regular'
        },
        sectionTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000"
        },
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
        },
        viewAllBtn: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 5
        },
        viewAllBtnText: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#2563EB',
            fontFamily: 'Manrope_700Bold'
        },
        infoLabel: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold'
        },
        infoSubLabel: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#333',
            fontFamily: 'Manrope_400Regular'
        },
        infoValue: {
            fontSize: 14,
            fontFamily: 'Manrope_400Regular',
            color: colorScheme === 'dark' ? '#fff' : '#000',
            flex: 1,
            textAlign: 'right',
            maxWidth: '80%'
        },
        fullInfoValue: {
            textAlign: 'left',
            maxWidth: '100%'
        },
        button: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2563eb',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 60,
            marginBottom: 12,
            gap: 10
        },
        logoutButton: {
            backgroundColor: '#3d78f8',
            marginBottom: 0,
            marginTop: 10
        },
        buttonText: {
            color: '#fff',
            fontSize: 16,
            fontFamily: 'Manrope_700Bold'
        },
        pageTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 24,
            color: '#fff',
        },
        metaText: {
            fontSize: 14,
            color: '#fff',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 14
        },
    });
