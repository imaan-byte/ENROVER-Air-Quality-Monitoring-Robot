import { Ionicons } from '@expo/vector-icons';
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, {
    Marker,
    Polyline,
    PROVIDER_DEFAULT,
    Region,
} from 'react-native-maps';

import { useBluetooth } from '../BluetoothContext';

const DEFAULT_REGION: Region = {
  latitude: 52.806,
  longitude: -1.642,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function isValidCoordinate(value: string) {
  const number = Number(value);

  return Number.isFinite(number) && number !== 0;
}

function getPm25Colour(pm25: number) {
  if (pm25 <= 12) {
    return '#16A34A';
  }

  if (pm25 <= 35.4) {
    return '#EAB308';
  }

  if (pm25 <= 55.4) {
    return '#F97316';
  }

  return '#DC2626';
}

function getPm25Label(pm25: number) {
  if (pm25 <= 12) {
    return 'Good';
  }

  if (pm25 <= 35.4) {
    return 'Moderate';
  }

  if (pm25 <= 55.4) {
    return 'Sensitive';
  }

  return 'Poor';
}

export default function MapScreen() {
  const {
    isConnected,
    connectionMessage,
    sensorData,
    routePoints,
    isRouteRecording,
    startRouteRecording,
    stopRouteRecording,
    clearRoute,
  } = useBluetooth();

  const latitude = Number(sensorData.latitude);
  const longitude = Number(sensorData.longitude);

  const hasGpsFix =
    sensorData.gpsValid === '1' &&
    isValidCoordinate(sensorData.latitude) &&
    isValidCoordinate(sensorData.longitude);

  const satellites =
    sensorData.satellites === '--'
      ? 0
      : Number(sensorData.satellites);

  const roverCoordinate = hasGpsFix
    ? {
        latitude,
        longitude,
      }
    : null;

  const currentRegion: Region = roverCoordinate
    ? {
        latitude: roverCoordinate.latitude,
        longitude: roverCoordinate.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      }
    : DEFAULT_REGION;

  const routeSegments =
    routePoints.slice(1).map(
      (point, index) => ({
        start: routePoints[index],
        end: point,
        colour: getPm25Colour(point.pm25),
      }),
    );

  const pm25Values = routePoints
    .map(point => point.pm25)
    .filter(value => Number.isFinite(value));

  const averagePm25 =
    pm25Values.length > 0
      ? pm25Values.reduce(
          (sum, value) => sum + value,
          0,
        ) / pm25Values.length
      : 0;

  const maximumPm25 =
    pm25Values.length > 0
      ? Math.max(...pm25Values)
      : 0;

  function handleRouteButton() {
    if (!isConnected) {
      Alert.alert(
        'Not connected',
        'Connect to ENROVER from the Dashboard before recording a route.',
      );

      return;
    }

    if (!hasGpsFix) {
      Alert.alert(
        'Waiting for GPS',
        'Move ENROVER outdoors and wait for a valid GPS fix before starting route recording.',
      );

      return;
    }

    if (isRouteRecording) {
      stopRouteRecording();

      Alert.alert(
        'Route recording stopped',
        `${routePoints.length} GPS points were recorded.`,
      );

      return;
    }

    startRouteRecording();

    Alert.alert(
      'Route recording started',
      'The app will now store live GPS points while ENROVER moves.',
    );
  }

  function handleClearRoute() {
    if (routePoints.length === 0) {
      Alert.alert(
        'No route recorded',
        'There are no route points to clear.',
      );

      return;
    }

    Alert.alert(
      'Clear route?',
      'This will remove all recorded GPS points from the current session.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearRoute,
        },
      ],
    );
  }

  const gpsStatusText = !isConnected
    ? 'Rover disconnected'
    : hasGpsFix
      ? `${satellites} satellites detected`
      : 'Waiting for satellite fix';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>ENROVER</Text>

          <Text style={styles.heading}>
            Live Location
          </Text>

          <Text style={styles.subtitle}>
            Location-based environmental monitoring
          </Text>

          <View
            style={[
              styles.connectionBadge,
              isConnected
                ? styles.connectedBadge
                : styles.disconnectedBadge,
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                {
                  backgroundColor: isConnected
                    ? '#16866F'
                    : '#94A3B8',
                },
              ]}
            />

            <Text
              style={[
                styles.connectionText,
                {
                  color: isConnected
                    ? '#116B59'
                    : '#64748B',
                },
              ]}
            >
              {connectionMessage}
            </Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            region={currentRegion}
            showsCompass
            showsScale
            showsBuildings
            showsTraffic={false}
          >
            {roverCoordinate && (
              <Marker
                coordinate={roverCoordinate}
                title="ENROVER"
                description={`PM2.5: ${sensorData.pm25} µg/m³ • PM10: ${sensorData.pm10} µg/m³ • TVOC: ${sensorData.tvoc} ppb • eCO₂: ${sensorData.eco2} ppm • Speed: ${sensorData.speed} km/h`}
              >
                <View style={styles.markerOuter}>
                  <View style={styles.markerInner}>
                    <Ionicons
                      name="car-sport"
                      size={23}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </Marker>
            )}

            {routeSegments.map(
              (segment, index) => (
                <Polyline
                  key={`segment-${segment.end.timestamp}-${index}`}
                  coordinates={[
                    {
                      latitude:
                        segment.start.latitude,
                      longitude:
                        segment.start.longitude,
                    },
                    {
                      latitude:
                        segment.end.latitude,
                      longitude:
                        segment.end.longitude,
                    },
                  ]}
                  strokeWidth={7}
                  strokeColor={segment.colour}
                />
              ),
            )}

            {routePoints.map((point, index) => (
              <Marker
                key={`${point.timestamp}-${index}`}
                coordinate={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                title={`Sample ${index + 1}: ${getPm25Label(point.pm25)}`}
                description={`PM2.5: ${point.pm25.toFixed(1)} µg/m³ • PM10: ${point.pm10.toFixed(1)} µg/m³ • TVOC: ${point.tvoc.toFixed(0)} ppb • ${new Date(point.timestamp).toLocaleTimeString()}`}
              >
                <View
                  style={[
                    styles.heatPointOuter,
                    {
                      backgroundColor:
                        `${getPm25Colour(
                          point.pm25,
                        )}33`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.heatPointInner,
                      {
                        backgroundColor:
                          getPm25Colour(
                            point.pm25,
                          ),
                      },
                    ]}
                  />
                </View>
              </Marker>
            ))}
          </MapView>

          {!hasGpsFix && (
            <View style={styles.mapOverlay}>
              <View style={styles.overlayIcon}>
                <Ionicons
                  name={
                    isConnected
                      ? 'navigate-outline'
                      : 'bluetooth-outline'
                  }
                  size={34}
                  color="#16866F"
                />
              </View>

              <Text style={styles.overlayTitle}>
                {isConnected
                  ? 'Waiting for GPS fix'
                  : 'ENROVER is offline'}
              </Text>

              <Text style={styles.overlayText}>
                {isConnected
                  ? 'Take the rover outdoors with a clear view of the sky. GPS may take a few minutes to detect satellites.'
                  : 'Connect to ENROVER from the Dashboard to display its live position.'}
              </Text>
            </View>
          )}

          {isRouteRecording && (
            <View style={styles.recordingBadge}>
              <View style={styles.recordingDot} />

              <Text style={styles.recordingText}>
                Recording route
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Ionicons
              name="navigate-outline"
              size={24}
              color="#16866F"
            />

            <Text style={styles.statusLabel}>
              Latitude
            </Text>

            <Text
              numberOfLines={1}
              style={styles.statusValue}
            >
              {hasGpsFix
                ? latitude.toFixed(6)
                : '--'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Ionicons
              name="location-outline"
              size={24}
              color="#16866F"
            />

            <Text style={styles.statusLabel}>
              Longitude
            </Text>

            <Text
              numberOfLines={1}
              style={styles.statusValue}
            >
              {hasGpsFix
                ? longitude.toFixed(6)
                : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.gpsCard}>
          <View style={styles.gpsIcon}>
            <Ionicons
              name="radio-outline"
              size={28}
              color="#16866F"
            />
          </View>

          <View style={styles.gpsDetails}>
            <Text style={styles.gpsTitle}>
              GPS signal
            </Text>

            <Text style={styles.gpsText}>
              {gpsStatusText}
            </Text>

            <Text style={styles.speedText}>
              Rover speed: {sensorData.speed} km/h
            </Text>
          </View>

          <Ionicons
            name={
              hasGpsFix
                ? 'checkmark-circle'
                : 'time-outline'
            }
            size={30}
            color={
              hasGpsFix
                ? '#16866F'
                : '#F59E0B'
            }
          />
        </View>

        <View style={styles.routeSummaryCard}>
          <View>
            <Text style={styles.routeSummaryLabel}>
              Recorded route
            </Text>

            <Text style={styles.routeSummaryValue}>
              {routePoints.length} points
            </Text>
          </View>

          <View style={styles.routeSummaryIcon}>
            <Ionicons
              name="trail-sign-outline"
              size={28}
              color="#16866F"
            />
          </View>
        </View>

        <View style={styles.pollutionSummaryCard}>
          <Text style={styles.pollutionSummaryTitle}>
            Route air-quality summary
          </Text>

          <View style={styles.pollutionSummaryRow}>
            <View style={styles.pollutionMetric}>
              <Text style={styles.pollutionMetricLabel}>
                Average PM2.5
              </Text>
              <Text style={styles.pollutionMetricValue}>
                {averagePm25.toFixed(1)} µg/m³
              </Text>
            </View>

            <View style={styles.pollutionMetric}>
              <Text style={styles.pollutionMetricLabel}>
                Maximum PM2.5
              </Text>
              <Text style={styles.pollutionMetricValue}>
                {maximumPm25.toFixed(1)} µg/m³
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: '#16A34A' },
                ]}
              />
              <Text style={styles.legendText}>
                Good
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: '#EAB308' },
                ]}
              />
              <Text style={styles.legendText}>
                Moderate
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: '#F97316' },
                ]}
              />
              <Text style={styles.legendText}>
                Sensitive
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: '#DC2626' },
                ]}
              />
              <Text style={styles.legendText}>
                Poor
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleRouteButton}
          style={({ pressed }) => [
            styles.routeButton,
            isRouteRecording &&
              styles.stopRouteButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={
              isRouteRecording
                ? 'stop-circle-outline'
                : 'radio-button-on-outline'
            }
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.routeButtonText}>
            {isRouteRecording
              ? 'Stop route recording'
              : 'Start route recording'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleClearRoute}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={21}
            color="#64748B"
          />

          <Text style={styles.clearButtonText}>
            Clear recorded route
          </Text>
        </Pressable>

        <View style={styles.informationCard}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#16866F"
          />

          <Text style={styles.informationText}>
            Each recorded GPS point can later be matched
            with the environmental reading collected at
            the same time. This allows ENROVER to map how
            air quality changes across different
            locations.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginTop: 12,
    marginBottom: 20,
  },
  brand: {
    color: '#16866F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heading: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: '800',
    color: '#102A27',
  },
  subtitle: {
    marginTop: 5,
    color: '#64748B',
  },
  connectionBadge: {
    marginTop: 13,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedBadge: {
    backgroundColor: '#E3F5EF',
  },
  disconnectedBadge: {
    backgroundColor: '#F1F5F4',
  },
  connectionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  connectionText: {
    fontWeight: '700',
  },
  mapCard: {
    height: 350,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDEDEA',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(22, 134, 111, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#16866F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(221, 237, 234, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 34,
  },
  overlayIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTitle: {
    marginTop: 15,
    fontSize: 19,
    fontWeight: '800',
    color: '#102A27',
  },
  overlayText: {
    marginTop: 7,
    color: '#527069',
    lineHeight: 20,
    textAlign: 'center',
  },
  recordingBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#DC4C4C',
    marginRight: 7,
  },
  recordingText: {
    fontWeight: '800',
    color: '#102A27',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  statusCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
  },
  statusLabel: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  statusValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#102A27',
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 17,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  gpsIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F4F0',
  },
  gpsDetails: {
    flex: 1,
    marginLeft: 14,
  },
  gpsTitle: {
    fontSize: 14,
    color: '#64748B',
  },
  gpsText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: '#102A27',
  },
  speedText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
  },
  routeSummaryCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#DFF4EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeSummaryLabel: {
    color: '#527069',
    fontSize: 13,
  },
  routeSummaryValue: {
    marginTop: 4,
    color: '#116B59',
    fontSize: 20,
    fontWeight: '800',
  },
  routeSummaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeButton: {
    marginTop: 17,
    paddingVertical: 16,
    borderRadius: 17,
    backgroundColor: '#16866F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 9,
  },
  stopRouteButton: {
    backgroundColor: '#DC4C4C',
  },
  routeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  clearButton: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 8,
  },
  clearButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '800',
  },
  informationCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#E3F5EF',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  informationText: {
    flex: 1,
    marginLeft: 10,
    color: '#527069',
    lineHeight: 19,
    fontSize: 13,
  },
  heatPointOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatPointInner: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pollutionSummaryCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  pollutionSummaryTitle: {
    color: '#102A27',
    fontSize: 16,
    fontWeight: '800',
  },
  pollutionSummaryRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pollutionMetric: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F4F7F6',
  },
  pollutionMetricLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  pollutionMetricValue: {
    marginTop: 4,
    color: '#102A27',
    fontSize: 17,
    fontWeight: '800',
  },
  legendRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});