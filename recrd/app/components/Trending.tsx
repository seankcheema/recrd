import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, TextInput, ActivityIndicator, StyleSheet, TouchableWithoutFeedback, Keyboard, Image, TouchableOpacity } from 'react-native';
import Nav from './Nav';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TextTicker from 'react-native-text-ticker';

const API_URL = 'http://192.168.1.71:8000';  // ← point this at your FastAPI server

export default function Trending() {
    const router = useRouter();
    const [searchResults, setSearchResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // Fetch most popular albums

    useEffect(() => {
        fetch(`http://192.168.1.71:8000/trending_albums/`)
            .then((r) => r.json())
            .then((data) => setSearchResults(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    console.log(searchResults)

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100, position: "relative", padding: 20 }}>

                <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontWeight: '800', marginBottom: 20 }}>
                    recrd
                </GlobalText>
                <ActivityIndicator style={{ position: "absolute", top: "50%", right: "50%" }} />
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
                <ScrollView style={{ padding: 20, paddingTop: 0 }}>

                    <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontWeight: '800' }}>
                        recrd
                    </GlobalText>
                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 10, fontWeight: '800' }}>
                        trending
                    </GlobalText>
                    {(searchResults.length > 0) ? (
                        searchResults.map((album: any) => (
                            <TouchableOpacity key={album.id} onPress={() => router.push(`/components/Album/${album.id}`)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                                    <Image source={{ uri: album.images[0].url }} style={{ width: 60, height: 60 }} />
                                    <View style={{ overflow: 'hidden', flex: 1 }}>
                                        <TextTicker
                                            // force it to measure full width
                                            style={[styles.globalText, { fontWeight: "800" }]}
                                            duration={5000}
                                            loop
                                            bounce={false}
                                            repeatSpacer={50}
                                            marqueeDelay={1000}
                                        >
                                            {album.name}
                                        </TextTicker>

                                        <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>
                                            by {album.artists.map((artist: { name: string }) => artist.name).join(', ')}
                                        </GlobalText>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <GlobalText style={{ color: '#FFFAF0A0', fontSize: 16 }}>no results found</GlobalText>
                    )}
                    {/* <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity> */}

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 10, fontWeight: '800' }}>
                        by genre
                    </GlobalText>
                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#5810E7", marginBottom: 10 }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>rap</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E75F10" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>pop</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E71022" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>r&b</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E7B510" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>indie</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#107CE7" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>country</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#CE10E7" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>hip-hop</GlobalText>
                        </TouchableOpacity>
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <TouchableOpacity style={{ height: 30, width: 100, backgroundColor: "#1e1e1e", alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                            <GlobalText>view all</GlobalText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <Nav />
            </View>
        </TouchableWithoutFeedback>
    );
}

const screenWidth = Dimensions.get('window').width;
const genreTileWidth = ((screenWidth - 40) * 0.33) - 5;

const styles = StyleSheet.create({
    genreTile: {
        backgroundColor: '#FFFAF0A0',
        width: genreTileWidth,
        height: genreTileWidth,
        borderRadius: 10,
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    globalText: {
        fontFamily: 'Nunito', // Global font
        fontSize: 16,
        color: '#FFFAF0',
      },
});
