import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';

// Shared Logic
import { AQIStation } from './lib/types';
import { calculateDistance, getAQIStatus, AQIStatus, calculateCigarettes } from './lib/utils';

// iOS Simulator: 'http://localhost:3000'
// Android Emulator: 'http://10.0.2.2:3000'
// Physical Device: 'http://192.168.0.3:3000' (UPDATE THIS IF NEEDED)
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

  const cigs = safety ? calculateCigarettes(safety.station.pm25) : 0;
  const isHighRisk = cigs > 5;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>PASSIVE SMOKER</Text>
        <Text style={styles.headerSubtitle}>AQI HEALTH MONITOR</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#fff" />}
      >

        {loading && !safety ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Analyzing Air Quality...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error: {errorMsg}</Text>
            <Text style={styles.hintText}>Ensure backend is running at {API_URL}</Text>
          </View>
        ) : safety ? (
          <>
            {/* HERO: CIGARETTE COUNTER */}
            <View style={[styles.heroCard, { borderColor: isHighRisk ? '#ef4444' : '#334155' }]}>
              <Text style={styles.heroTitle}>DAILY EXPOSURE</Text>
              <View style={styles.heroContent}>
                <Text style={styles.heroEmoji}>🚬</Text>
                <View>
                  <Text style={styles.heroValue}>{cigs}</Text>
                  <Text style={styles.heroLabel}>CIGARETTES</Text>
                </View>
              </View>
              <Text style={styles.heroSubtext}>
                Inhaled today just by breathing the air in {safety.station.name}.
              </Text>
            </View>

            {/* SECONDARY: AQI STATUS */}
            <View style={[styles.statusCard, { backgroundColor: safety.status.color }]}>
              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.statusLabel}>AIR QUALITY</Text>
                  <Text style={styles.statusValue}>{safety.station.aqi}</Text>
                  <Text style={styles.statusText}>{safety.status.label}</Text>
                </View>
                <View style={styles.statusRight}>
                  <Text style={styles.pmTitle}>PM2.5</Text>
                  <Text style={styles.pmValue}>{safety.station.pm25}</Text>
                </View>
              </View>
              <Text style={styles.statusMessage}>{safety.status.message}</Text>
            </View>

            {/* MAP PREVIEW */}
            {location && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  scrollEnabled={false}
                  initialRegion={{
                    latitude: safety.station.location.lat,
                    longitude: safety.station.location.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                    title="You are here"
                    pinColor="blue"
                  />
                  <Marker
                    coordinate={{ latitude: safety.station.location.lat, longitude: safety.station.location.lng }}
                    title={safety.station.name}
                    description={`AQI: ${safety.station.aqi}`}
                    pinColor={safety.status.color}
                  />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapText}>Nearest Station: {safety.station.name} ({safety.distance.toFixed(1)} km)</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.waitingText}>No data available.</Text>
        )}

      </ScrollView>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
        <Text style={styles.refreshBtnText}>CHECK NOW</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Very dark slate
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#020617',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900', // Black font weight
    color: '#f8fafc',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
    letterSpacing: 4,
    marginTop: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
  },
  waitingText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 50,
  },

  // HERO CARD
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
  heroTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 56,
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 60,
  },
  heroLabel: {
    color: '#ef4444', // Red
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heroSubtext: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
  },

  // STATUS CARD
  statusCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusValue: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pmTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pmValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },

  // MAP
  mapContainer: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
  },
  mapText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
  },

  refreshBtn: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  refreshBtnText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hintText: {
    color: '#fca5a5',
    fontSize: 12,
  }
});
