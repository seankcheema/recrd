import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, TextInput, ActivityIndicator, StyleSheet, TouchableWithoutFeedback, Keyboard, Image, TouchableOpacity } from 'react-native';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TextTicker from 'react-native-text-ticker';
import { HOST_IP } from '@env';

const API_URL = `http://${HOST_IP}:8000`; 

export default function Trending() {
    const router = useRouter();
    const [searchResults, setSearchResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // Fetch most popular albums

    useEffect(() => {
        fetch(`${API_URL}/trending_albums/`)
            .then((r) => r.json())
            .then((data) => setSearchResults(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
                <ScrollView style={{ padding: 20, paddingVertical: 0 }}>

                    <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontFamily: 'Nunito-Bold' }}>
                        recrd
                    </GlobalText>
                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
                        trending
                    </GlobalText>
                    <ActivityIndicator />
                    

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
                        by genre
                    </GlobalText>
                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#5810E7", marginBottom: 10 }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "rap" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>rap</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E75F10" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "pop" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>pop</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E71022" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "r&b" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>r&b</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E7B510" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "indie" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>indie</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#107CE7" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "country" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>country</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#CE10E7" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "hip-hop" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>hip-hop</GlobalText>
                        </TouchableOpacity>
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <TouchableOpacity style={{ height: 30, width: 100, backgroundColor: "#1e1e1e", alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                            <GlobalText>view all</GlobalText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
                <ScrollView style={{ padding: 20, paddingTop: 0 }}>

                    <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontFamily: 'Nunito-Bold' }}>
                        recrd
                    </GlobalText>
                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
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
                                            style={[styles.globalText, { fontFamily: 'Nunito-Bold' }]}
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
                    

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
                        by genre
                    </GlobalText>
                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#5810E7", marginBottom: 10 }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "rap" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>rap</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E75F10" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "pop" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>pop</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E71022" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "r&b" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>r&b</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E7B510" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "indie" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>indie</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#107CE7" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "country" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>country</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#CE10E7" }]} onPress={() => router.push({pathname: "/components/Genre/[genreName]", params: { genreName: "hip-hop" },})}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontFamily: 'Nunito-Bold' }}>hip-hop</GlobalText>
                        </TouchableOpacity>
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <TouchableOpacity style={{ height: 30, width: 100, backgroundColor: "#1e1e1e", alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                            <GlobalText>view all</GlobalText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

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
        fontFamily: 'Nunito-Regular', // Global font
        fontSize: 16,
        color: '#FFFAF0',
      },
});
