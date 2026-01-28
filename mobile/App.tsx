import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';

// Shared Logic
import { AQIStation } from './lib/types';
import { calculateDistance, getAQIStatus, AQIStatus } from './lib/utils';

// iOS Simulator: 'http://localhost:3000'
// Android Emulator: 'http://10.0.2.2:3000'
// Physical Device: 'http://192.168.0.3:3000'
const API_URL = 'http://192.168.0.3:3000/api/stations';

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [stations, setStations] = useState<AQIStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [safety, setSafety] = useState<{ status: AQIStatus, station: AQIStation, distance: number } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Get Permission & Location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // 2. Fetch Stations from Backend
      console.log('Fetching from:', API_URL);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to connect to Brain API');

      const data: AQIStation[] = await response.json();
      setStations(data);

      // 3. Calculate Safety
      if (location && data.length > 0) {
        let minDist = Infinity;
        let nearest: AQIStation | null = null;

        data.forEach(station => {
          const d = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            station.location.lat,
            station.location.lng
          );
          if (d < minDist) {
            minDist = d;
            nearest = station;
          }
        });

        if (nearest) {
          const status = getAQIStatus((nearest as AQIStation).aqi);
          setSafety({ status, station: nearest, distance: minDist });
        }
      }

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delhi Pollution Guard</Text>
        <Text style={styles.headerSubtitle}>Connected to Command Centre</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#fff" />}
      >

        {/* SAFETY CARD */}
        {safety ? (
          <View style={[styles.card, { borderColor: safety.status.color }]}>
            <View style={[styles.cardHeader, { backgroundColor: safety.status.color }]}>
              <Text style={styles.cardInfoTitle}>
                {safety.status.isSafe ? "You are in a Safe Zone" : "Health Alert"}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.aqiValue} selectionColor={safety.status.color}>{safety.station.aqi}</Text>
              <Text style={[styles.aqiLabel, { color: safety.status.color }]}>AQI: {safety.status.label}</Text>

              <Text style={styles.message}>{safety.status.message}</Text>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.metaLabel}>Nearest Station:</Text>
                <Text style={styles.metaValue}>{safety.station.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.metaLabel}>Distance:</Text>
                <Text style={styles.metaValue}>{safety.distance.toFixed(1)} km away</Text>
              </View>
            </View>
          </View>
        ) : (
          !loading && <Text style={styles.waitingText}>Could not determine safety status.</Text>
        )}

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error: {errorMsg}</Text>
            <Text style={styles.hintText}>Ensure backend is running at http://192.168.0.3:3000</Text>
          </View>
        )}

        {/* MAP PREVIEW */}
        {location && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker
                coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                title="You are here"
                pinColor="blue"
              />
              {safety && (
                <Marker
                  coordinate={{ latitude: safety.station.location.lat, longitude: safety.station.location.lng }}
                  title={safety.station.name}
                  description={`AQI: ${safety.station.aqi}`}
                  pinColor={safety.status.color}
                />
              )}
            </MapView>
          </View>
        )}

      </ScrollView>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
        <Text style={styles.refreshBtnText}>Check My Safety</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-950
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#1e293b', // slate-800
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    padding: 16,
  },
  cardInfoTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  cardBody: {
    padding: 20,
    alignItems: 'center',
  },
  aqiValue: {
    fontSize: 64,
    fontWeight: '900',
    color: 'white',
  },
  aqiLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    width: '100%',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  metaValue: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hintText: {
    color: '#eca9a9',
    fontSize: 12,
  },
  waitingText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  refreshBtn: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  refreshBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
