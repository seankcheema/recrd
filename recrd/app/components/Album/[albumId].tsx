// app/components/Album/[albumId].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';    // ← useLocalSearchParams, not useSearchParams
import GlobalText from '../GlobalText';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HOST_IP } from '@env';


const { width } = Dimensions.get('window');
const COVER_SIZE = width - 80;

interface AlbumData {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  tracks: { items: { duration_ms: number }[] };
  dominant_color: string;
}



export default function AlbumPage() {
  const router = useRouter();
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    fetch(`http://${HOST_IP}:8000/albums/${albumId}`)
      .then((r) => r.json())
      .then((data) => setAlbum(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [albumId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20, marginLeft: 10 }}>
                        <Feather name="chevron-left" size={32} color="#E7BC10" />
                    </TouchableOpacity>

                    <ActivityIndicator style={{ position: "absolute", top: "50%", right: "50%" }} />


            </View>
    );
  }
  if (!album) {
    return (
      <View style={styles.center}>
        <GlobalText>Album not found.</GlobalText>
      </View>
    );
  }

  const totalMs = album.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000)
    .toString()
    .padStart(2, '0');
  const releaseYear = album.release_date.split('-')[0];

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
            <Feather name="chevron-left" size={32} color="#E7BC10" />
          </TouchableOpacity>
        <ScrollView style={{ padding: 20 }}>
          <View style={styles.coverWrapper}>
            <View
              style={[
                styles.coverShadow,
                { shadowColor: album.dominant_color}
              ]}
            >
              <Image
                source={{ uri: album.images[0]?.url }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.albumActions}>
              <TouchableOpacity><Feather name="plus-circle" size={32} color="#FFFAF0E6" /></TouchableOpacity>
              <TouchableOpacity><Feather name="bookmark" size={32} color="#FFFAF0E6" /></TouchableOpacity>
            </View>
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <GlobalText style={styles.title}>{album.name}</GlobalText>
            <GlobalText style={styles.artists}>
              by {album.artists.map((a) => a.name).join(', ')}
            </GlobalText>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
              <GlobalText style={{ fontSize: 12 }}>
                {releaseYear}
              </GlobalText>
              <GlobalText style={{ fontSize: 12 }}>
                ∙
              </GlobalText>
              <GlobalText style={{ fontSize: 12 }}>
                {minutes}
              </GlobalText>
              <GlobalText style={{ fontSize: 12 }}>
                minutes
              </GlobalText>
            </View>
          </View>


          <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
            friends' rankings
          </GlobalText>

        </ScrollView>

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { alignItems: 'center', padding: 20 },
  coverWrapper: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    alignSelf: 'center',
    marginBottom: 5,
    marginTop: 20,
  },

  coverShadow: {
    flex: 1,
    backgroundColor: '#111111',
    // iOS
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    // Android
    elevation: 8,
  },
  coverImage: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
  },
  artists: {
    fontSize: 14,
    marginBottom: 0,
  },
  albumActions: {
    position: "absolute", 
    bottom: 5, 
    right: 5, 
    justifyContent: 'space-between', 
    gap: 20, 
    flexDirection: 'row',
    backgroundColor: "#111111F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  }
});
