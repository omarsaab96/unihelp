import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Dimensions, Platform, useColorScheme, TextInput, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from "expo-secure-store";
import { getCurrentUser, fetchWithoutAuth, logout, fetchWithAuth } from "../src/api";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator } from 'react-native-paper';
import { Buffer } from 'buffer';

const { width } = Dimensions.get('window');

export default function EditProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    let colorScheme = useColorScheme();
    const styles = styling(colorScheme, insets);
    const [user, setUser] = useState(null)
    const [uploadingPicture, setUploadingPicture] = useState(false);

    const scrollRef = useRef<ScrollView>(null);

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState("");
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    const [university, setUniversity] = useState(null);
    const [major, setMajor] = useState(null);
    const [minor, setMinor] = useState(null);
    const [gpa, setGpa] = useState(null);

    const [firstNameTouched, setFirstNameTouched] = useState(false);
    const [lastNameTouched, setLastNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);

    const [firstNameError, setFirstNameError] = useState(false);
    const [lastNameError, setLastNameError] = useState(false);
    const [emailError, setEmailError] = useState(false);

    const firstNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const data = await getCurrentUser();
                if (data.error) {
                    console.error("Error", data.error);
                } else {
                    await SecureStore.setItem('user', JSON.stringify(data))
                    setUser(data)
                    setFirstName(data.firstname)
                    setLastName(data.lastname)
                    setEmail(data.email)
                    setProfilePicture(data.photo)
                    setUniversity(data.university)
                    setMajor(data.major)
                    setMinor(data.minor)
                    setGpa(data.gpa)
                }

            } catch (err) {
                console.error("Error", err.message);
            }
        }
        getUserInfo()
    }, []);

    const checkFirstName = (fname: string) => {
        setFirstName(fname);

        if (firstNameTimeoutRef.current) clearTimeout(firstNameTimeoutRef.current);

        if (fname.trim() === "" || fname.trim().length < 3) {
            setFirstNameError(true);
            return; // invalid, don’t save
        }

        setFirstNameError(false);

        // debounce save
        firstNameTimeoutRef.current = setTimeout(() => {
            saveChange("firstname", fname.trim());
        }, 1000);
    };

    const checkLastName = (lname: string) => {
        setLastName(lname);

        if (lastNameTimeoutRef.current) clearTimeout(lastNameTimeoutRef.current);

        if (lname.trim() === "" || lname.trim().length < 3) {
            setLastNameError(true);
            return;
        }

        setLastNameError(false);

        lastNameTimeoutRef.current = setTimeout(() => {
            saveChange("lastname", lname.trim());
        }, 1000);
    };

    const checkEmail = (email: string) => {
        setEmail(email);
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);

        if (email.trim() === "" || !regex.test(email.trim())) {
            setEmailError(true);
            return;
        }

        setEmailError(false);

        emailTimeoutRef.current = setTimeout(() => {
            saveChange("email", email.trim());
        }, 1000);
    };

    const saveChange = async (field: string, value: string) => {
        const token = await SecureStore.getItem('accessToken')

        try {
            const response = await fetchWithAuth(`/users/edit`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": token,
                },
                body: JSON.stringify({
                    [field]: value,
                }),
            });

            if (response.ok) {
                const savedUserInfoString = await SecureStore.getItem('userInfo');
                let savedUserInfo = savedUserInfoString ? JSON.parse(savedUserInfoString) : {};

                switch (field) {
                    case 'firstname':
                        savedUserInfo.firstName = value;
                        break;
                    case 'lastname':
                        savedUserInfo.lastName = value;
                        break;
                    case 'email':
                        savedUserInfo.email = value;
                        break;
                    default: break;
                }

                // Save it back to SecureStore
                await SecureStore.setItem('userInfo', JSON.stringify(savedUserInfo));

                console.log("User info saved!");
            } else {
                console.warn(response);
                console.error("Failed to save user info", await response.text());
            }
        } catch (err) {
            console.error("Error saving user info:", err);
        }
    };

    const uploadToImageKit = async (uri: string) => {
        try {
            const fileName = uri.split('/').pop() || 'upload';
            const fileExtension = fileName.split('.').pop()?.toLowerCase();
            const mimeType = fileExtension?.match(/mp4|mov|avi|webm|mkv/)
                ? `video/${fileExtension}`
                : `image/${fileExtension}`;

            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName,
                type: mimeType,
            } as any);
            formData.append('fileName', fileName);
            formData.append('folder', '/Unihelp');

            const privateAPIKey = 'private_pdmJIJI6e538/CVmr4CyBdHW2wc=';
            const encodedAuth = Buffer.from(privateAPIKey + ':').toString('base64');

            const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Basic ${encodedAuth}`,
                },
                body: formData,
            });

            if (uploadResponse.ok) {
                const result = await uploadResponse.json();
                return {
                    type: mimeType.startsWith('video') ? 'video' : 'image',
                    url: result.url
                };
            } else {
                console.error('Failed to upload file:', await uploadResponse.text());
                return null;
            }
        } catch (error) {
            console.error('Error uploading to ImageKit:', error);
            return null;
        }
    };

    const handleChangeProfilePicture = async () => {
        try {
            // Pick image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                const selectedAsset = result.assets[0];
                const localUri = selectedAsset.uri;

                // Show preview immediately
                setProfilePicture(localUri);
                setUploadingPicture(true);

                // Upload to ImageKit
                const uploadedFile = await uploadToImageKit(localUri);

                if (uploadedFile && uploadedFile.url) {
                    try {
                        // Save URL in your backend database
                        const token = await SecureStore.getItem('accessToken');

                        const response = await fetchWithAuth(`/users/edit`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': token,
                            },
                            body: JSON.stringify({
                                photo: uploadedFile.url,
                            }),
                        });

                        if (response.ok) {
                            console.log('Profile picture updated successfully!');
                            setProfilePicture(uploadedFile.url); // replace local URI with actual uploaded URL
                        } else {
                            console.error('Failed to save profile picture in DB:', await response.text());
                        }
                    } catch (dbError) {
                        console.error('Error saving profile picture to DB:', dbError);
                    }
                } else {
                    console.error('ImageKit upload failed.');
                }
            }
        } catch (error) {
            console.error('Error picking or uploading image:', error);
        } finally {
            setUploadingPicture(false);
        }
    };

    const handleChangePassword = () => {

    }

    return (
        <View style={styles.appContainer}>
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
                        <Text style={styles.pageTitle}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {user && <ScrollView ref={scrollRef} style={styles.scrollArea}>
                <TouchableOpacity style={styles.profilePictureChangeLink} onPress={() => { handleChangeProfilePicture() }}>
                    <Image
                        source={{ uri: profilePicture }}
                        style={styles.profilePicture} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {uploadingPicture &&
                            <ActivityIndicator size="small" color="#2563EB" style={{ transform: [{ scale: 0.8 }] }} />
                        }
                        <Text style={styles.profilePictureChangeText}>{uploadingPicture ? 'Uploading' : 'Change'}</Text>
                    </View>

                </TouchableOpacity>

                <View style={styles.profileSection}>
                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="First Name"
                            placeholderTextColor="#707070"
                            keyboardType="default"
                            value={firstName}
                            onChangeText={(text => { checkFirstName(text) })}
                            autoCapitalize="none"
                            onBlur={() => {
                                setFirstNameTouched(true)
                            }}
                            selectionColor='#2563EB'
                        />
                        {firstNameError && firstNameTouched && <MaterialIcons name="error-outline" size={20} color="red" />}
                    </View>

                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Last Name"
                            placeholderTextColor="#707070"
                            keyboardType="default"
                            value={lastName}
                            onChangeText={(text => { checkLastName(text) })}
                            autoCapitalize="none"
                            onBlur={() => setLastNameTouched(true)}
                            selectionColor='#2563EB'
                        />
                        {lastNameError && lastNameTouched && <MaterialIcons name="error-outline" size={20} color="red" />}
                    </View>

                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#707070"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={(text => { checkEmail(text) })}
                            autoCapitalize="none"
                            onBlur={() => setEmailTouched(true)}
                            selectionColor='#2563EB'
                        />
                        {emailError && emailTouched && <MaterialIcons name="error-outline" size={20} color="red" />}
                    </View>

                    <View style={[styles.profileLink, styles.lastProfileLink]}>
                        <Text style={styles.profileLinkText}>Password</Text>
                        <TouchableOpacity onPress={() => { handleChangePassword() }}>
                            <Text style={styles.link}>Change</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>University Info</Text>
                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>University</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="University name"
                            placeholderTextColor="#707070"
                            keyboardType="default"
                            value={university==null? 'No university' : university}
                            onChangeText={(text) => { setUniversity(text); saveChange('university', text) }}
                            autoCapitalize="none"
                            selectionColor='#2563EB'
                            editable={false}
                        />
                    </View>
                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>Major</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Major"
                            placeholderTextColor="#707070"
                            keyboardType="default"
                            value={major}
                            onChangeText={(text) => { setMajor(text); saveChange('major', text) }}
                            autoCapitalize="none"
                            selectionColor='#2563EB'
                        />
                    </View>
                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>Minor</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Minor"
                            placeholderTextColor="#707070"
                            keyboardType="default"
                            value={minor}
                            onChangeText={(text) => { setMinor(text); saveChange('minor', text) }}
                            autoCapitalize="none"
                            selectionColor='#2563EB'
                        />
                    </View>
                    <View style={styles.profileLink}>
                        <Text style={styles.profileLinkText}>GPA</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="GPA"
                            placeholderTextColor="#707070"
                            keyboardType="default"
                            value={gpa}
                            onChangeText={(text) => { setGpa(text); saveChange('gpa', text) }}
                            autoCapitalize="none"
                            selectionColor='#2563EB'
                        />
                    </View>
                </View>
            </ScrollView>}

            {/* {user &&
                <View style={[styles.container,styles.actions]}>
                    <TouchableOpacity style={styles.button} onPress={() => handleCancel()}>
                        <FontAwesome name="edit" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={() => handleLogout()}>
                        <FontAwesome name="sign-out" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Logout</Text>
                    </TouchableOpacity>
                </View>} */}
        </View>
    );
}

const styling = (colorScheme: string, insets: any) =>
    StyleSheet.create({
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
        actions: {
            paddingBottom: insets.bottom
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
            marginBottom: 10,
            backgroundColor: colorScheme === 'dark' ? '#2563EB' : '#2563EB',
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,

        },
        paddedHeader: {
            paddingTop: 20,
            // marginBottom: 20
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
            marginBottom: 30
        },
        stat: {
            width: (width - 50) / 2,
            borderRadius: 30,
            padding: 20,
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
        infoLabel: {
            fontSize: 14,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_600SemiBold'
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
            backgroundColor: '#ef4444',
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
            marginBottom: 30
        },
        metaText: {
            fontSize: 14,
            color: '#fff',
            fontFamily: 'Manrope_700Bold',
            lineHeight: 14
        },
        profilePictureChangeLink: {
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 20
        },
        profilePicture: {
            width: 80,
            height: 80,
            aspectRatio: 1,
            borderRadius: 50,
            objectFit: 'contain'
        },
        profilePictureChangeText: {
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 16,
            textAlign: 'center',
            color: '#2563EB'
        },
        profileSectionTitle: {
            fontFamily: 'Manrope_700Bold',
            fontSize: 16,
            marginBottom: 5,
            color: colorScheme === 'dark' ? '#fff' : "#000",
            paddingHorizontal: 10

        },
        profileSection: {
            marginBottom: 30,
            paddingHorizontal: 10
        },
        profileLink: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
            borderBottomWidth: 1,
            borderColor: '#DEDEDE',
            gap: 20,
            flexWrap: 'wrap'
        },
        lastProfileLink: {
            borderBottomWidth: 0,
        },
        profileLinkText: {
            color: '#000',
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 16,
            lineHeight: 16
        },
        input: {
            flex: 1,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            fontFamily: 'Manrope_400Regular',
            fontSize: 16,
            textAlign: 'right',
        },
        link: {
            color: '#2563EB',
            fontSize: 16,
            fontFamily: 'Manrope_600SemiBold',
            paddingVertical: 10
        },
    });