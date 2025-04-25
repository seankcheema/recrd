import React, { useState } from 'react';
import { Dimensions, View, Text, ScrollView, TextInput, StyleSheet, Image, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';

export default function Home() {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
    };

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
                <ScrollView style={{ padding: 20, paddingTop: 0 }}>

                    <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontFamily: 'Nunito-Bold' }}>
                        username
                    </GlobalText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, width: '100%' }}>
                        <Image source={require('@/assets/images/placeholder_album.png')} style={styles.pfp} />
                        <View style={styles.profileInfo}>
                            <GlobalText style={{ color: '#FFFAF0', fontSize: 24, fontFamily: 'Nunito-Bold', marginBottom: "auto", flexWrap: "wrap", maxWidth: '100%' }}>
                                user name
                            </GlobalText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, width: '100%', justifyContent: 'space-between' }}>
                                <TouchableOpacity style={{ flexDirection: 'column', alignItems: 'center', marginTop: 5 }}>
                                    <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginLeft: 5, fontFamily: 'Nunito-Bold' }}>
                                        1,000
                                    </GlobalText>
                                    <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginLeft: 5 }}>
                                        followers
                                    </GlobalText>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ flexDirection: 'column', alignItems: 'center', marginTop: 5 }}>
                                    <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginLeft: 5, fontFamily: 'Nunito-Bold' }}>
                                        1,000
                                    </GlobalText>
                                    <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginLeft: 5 }}>
                                        following
                                    </GlobalText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginTop: 15 }}>
                        this is my temporary bio! RAHHHHHHHHHHHHHHHHHHHHH
                    </GlobalText>

                    <View style={{ flexDirection: 'row', marginTop: 15, width: '100%', justifyContent: 'space-between' }}>
                        <TouchableOpacity style={styles.profileButton}>
                            <GlobalText>
                                edit profile
                            </GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.profileButton}>
                            <GlobalText>
                                share profile
                            </GlobalText>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <GlobalText style={{ fontSize: 12, marginTop: 5, fontFamily: 'Nunito-Bold' }}>
                            12
                        </GlobalText>
                        <GlobalText style={{ fontSize: 12, marginTop: 5 }}>
                            total rankings ∙
                        </GlobalText>
                        <GlobalText style={{ fontSize: 12, marginTop: 5, fontFamily: 'Nunito-Bold' }}>
                            3
                        </GlobalText>
                        <GlobalText style={{ fontSize: 12, marginTop: 5 }}>
                            to be listened
                        </GlobalText>
                    </View>

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
                        favorite albums
                    </GlobalText>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={styles.album} />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={styles.album} />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={styles.album} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <TouchableOpacity style={{ height: 30, width: 100, backgroundColor: "#1e1e1e", alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                            <GlobalText>view all</GlobalText>
                        </TouchableOpacity>
                    </View>

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
                        activity
                    </GlobalText>

                    <View style={{ flexDirection: 'column', width: '100%' }}>
                        <TouchableOpacity style={styles.postView}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={styles.smallpfp} />
                            <GlobalText style={{ color: '#FFFAF0', fontSize: 16, fontFamily: 'Nunito-Bold', marginLeft: 10 }}>
                                user name
                            </GlobalText>
                            <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginLeft: 5 }}>
                                listened to
                            </GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.postView}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={styles.smallalbum} />
                            <View>
                                <GlobalText style={{ color: '#FFFAF0', fontSize: 16, fontFamily: 'Nunito-Bold', marginLeft: 10 }}>
                                    Mr. Morale and the Big Steppers
                                </GlobalText>
                                <GlobalText style={{ color: '#FFFAF0A0', fontSize: 14, marginLeft: 10 }}>
                                    by Kendrick Lamar
                                </GlobalText>
                            </View>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', gap: 20 }}>
                            <TouchableOpacity>
                                <Feather name="heart" size={28} color="#FFFAF0" />
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <Feather name="message-circle" size={28} color="#FFFAF0" />
                            </TouchableOpacity>
                        </View>

                        <View
                            style={{
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: '#FFFAF01A',
                                marginVertical: 10,
                            }}
                        />


                    </View>
                </ScrollView>

            </View>
        </TouchableWithoutFeedback>
    );
}

const screenWidth = Dimensions.get('window').width;
const profileInfoWidth = screenWidth - 60 - 150;
const profileButtonWidth = ((screenWidth - 40) * 0.5) - 5;
const albumTileWidth = ((screenWidth - 40) * 0.33) - 5;

const styles = StyleSheet.create({
    pfp: {
        width: 100,
        height: 100,
        borderWidth: 1,
        borderColor: "#FFFAF010",
        borderRadius: 100,
    },
    album: {
        width: albumTileWidth,
        height: albumTileWidth,
    },
    profileInfo: {
        marginLeft: 20,
        flexDirection: 'column',
        justifyContent: 'center',
        width: profileInfoWidth,
        alignItems: 'center',
    },
    profileButton: {
        borderWidth: 2,
        borderColor: "#E7BC10",
        borderRadius: 10,
        width: profileButtonWidth,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
    },
    postView: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        width: '100%',
    },
    smallpfp: {
        width: 40,
        height: 40,
        borderRadius: 100,
    },
    smallalbum: {
        width: 50,
        height: 50,
    }
});
