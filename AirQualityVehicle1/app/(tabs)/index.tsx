import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useBluetooth } from '../BluetoothContext';

type SensorCardProps = {
  title: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function SensorCard({
  title,
  value,
  unit,
  icon,
}: SensorCardProps) {
  return (
    <View style={styles.sensorCard}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={24}
          color="#16866F"
        />
      </View>

      <Text style={styles.sensorTitle}>
        {title}
      </Text>

      <View style={styles.valueRow}>
        <Text style={styles.sensorValue}>
          {value}
        </Text>

        <Text style={styles.sensorUnit}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

function getAirQualityStatus(pm25: string) {
  const value = Number(pm25);

  if (!Number.isFinite(value)) {
    return {
      label: 'Waiting for data',
      description:
        'ENROVER is connected and waiting for the first particulate reading.',
      icon: 'time-outline' as const,
      statusStyle: 'waiting' as const,
    };
  }

  if (value <= 12) {
    return {
      label: 'Good',
      description:
        'PM2.5 readings are currently within a low range.',
      icon: 'checkmark-circle-outline' as const,
      statusStyle: 'good' as const,
    };
  }

  if (value <= 35.4) {
    return {
      label: 'Moderate',
      description:
        'PM2.5 readings are elevated but remain within a moderate range.',
      icon: 'alert-circle-outline' as const,
      statusStyle: 'moderate' as const,
    };
  }

  if (value <= 55.4) {
    return {
      label: 'Unhealthy for sensitive groups',
      description:
        'Sensitive individuals may experience effects from the current PM2.5 level.',
      icon: 'warning-outline' as const,
      statusStyle: 'sensitive' as const,
    };
  }

  return {
    label: 'Poor',
    description:
      'The current PM2.5 reading is high. Consider moving the rover to another location.',
    icon: 'warning-outline' as const,
    statusStyle: 'poor' as const,
  };
}

export default function DashboardScreen() {
  const {
    isConnected,
    isScanning,
    connectionMessage,
    sensorData,
    lastRawData,
    connectToEnrover,
    disconnectFromEnrover,
  } = useBluetooth();

  const airQuality = isConnected
    ? getAirQualityStatus(sensorData.pm25)
    : {
        label: 'Offline',
        description:
          'Connect to the rover to begin receiving live environmental readings.',
        icon: 'cloud-offline-outline' as const,
        statusStyle: 'offline' as const,
      };

  async function handleBluetoothButton() {
    if (isScanning) {
      return;
    }

    if (isConnected) {
      await disconnectFromEnrover();
      return;
    }

    await connectToEnrover();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>
            Air Quality Vehicle
          </Text>

          <Text style={styles.subtitle}>
            Live environmental monitoring
          </Text>

          <View
            style={[
              styles.connectionBadge,
              !isConnected &&
                styles.disconnectedBadge,
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                !isConnected &&
                  styles.disconnectedDot,
              ]}
            />

            <Text
              style={[
                styles.connectionText,
                !isConnected &&
                  styles.disconnectedText,
              ]}
            >
              {connectionMessage}
            </Text>
          </View>

          <Pressable
            disabled={isScanning}
            onPress={handleBluetoothButton}
            style={({ pressed }) => [
              styles.bluetoothButton,
              isConnected &&
                styles.disconnectButton,
              isScanning &&
                styles.disabledButton,
              pressed &&
                !isScanning &&
                styles.buttonPressed,
            ]}
          >
            {isScanning ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name={
                  isConnected
                    ? 'close-circle-outline'
                    : 'bluetooth-outline'
                }
                size={22}
                color="#FFFFFF"
              />
            )}

            <Text
              style={styles.bluetoothButtonText}
            >
              {isScanning
                ? 'Searching for ENROVER...'
                : isConnected
                  ? 'Disconnect ENROVER'
                  : 'Connect to ENROVER'}
            </Text>
          </Pressable>

          <Text style={styles.connectionHint}>
            This connection is shared automatically
            with the Rover, Map, Analytics and
            Settings pages.
          </Text>
        </View>

        <View
          style={[
            styles.airQualityCard,
            airQuality.statusStyle === 'moderate' &&
              styles.airQualityModerateCard,
            airQuality.statusStyle === 'sensitive' &&
              styles.airQualitySensitiveCard,
            airQuality.statusStyle === 'poor' &&
              styles.airQualityPoorCard,
            airQuality.statusStyle === 'offline' &&
              styles.airQualityOfflineCard,
          ]}
        >
          <View style={styles.airQualityContent}>
            <Text style={styles.airQualityLabel}>
              Current air quality
            </Text>

            <Text style={styles.airQualityStatus}>
              {airQuality.label}
            </Text>

            <Text style={styles.airQualityDescription}>
              {airQuality.description}
            </Text>

            <View style={styles.airQualityMetrics}>
              <View style={styles.airQualityMetric}>
                <Text style={styles.metricLabel}>
                  PM2.5
                </Text>
                <Text style={styles.metricValue}>
                  {sensorData.pm25} µg/m³
                </Text>
              </View>

              <View style={styles.airQualityMetric}>
                <Text style={styles.metricLabel}>
                  PM10
                </Text>
                <Text style={styles.metricValue}>
                  {sensorData.pm10} µg/m³
                </Text>
              </View>

              <View style={styles.airQualityMetric}>
                <Text style={styles.metricLabel}>
                  TVOC
                </Text>
                <Text style={styles.metricValue}>
                  {sensorData.tvoc} ppb
                </Text>
              </View>

              <View style={styles.airQualityMetric}>
                <Text style={styles.metricLabel}>
                  eCO₂
                </Text>
                <Text style={styles.metricValue}>
                  {sensorData.eco2} ppm
                </Text>
              </View>
            </View>
          </View>

          <Ionicons
            name={airQuality.icon}
            size={54}
            color="#16866F"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Sensor readings
        </Text>

        <View style={styles.grid}>
          <SensorCard
            title="Temperature"
            value={sensorData.temperature}
            unit="°C"
            icon="thermometer-outline"
          />

          <SensorCard
            title="Humidity"
            value={sensorData.humidity}
            unit="%"
            icon="water-outline"
          />

          <SensorCard
            title="Pressure"
            value={sensorData.pressure}
            unit="hPa"
            icon="speedometer-outline"
          />

          <SensorCard
            title="TVOC"
            value={sensorData.tvoc}
            unit="ppb"
            icon="cloud-outline"
          />

          <SensorCard
            title="eCO₂"
            value={sensorData.eco2}
            unit="ppm"
            icon="analytics-outline"
          />

          <SensorCard
            title="PM1.0"
            value={sensorData.pm1}
            unit="µg/m³"
            icon="cloud-outline"
          />

          <SensorCard
            title="PM2.5"
            value={sensorData.pm25}
            unit="µg/m³"
            icon="cloudy-outline"
          />

          <SensorCard
            title="PM10"
            value={sensorData.pm10}
            unit="µg/m³"
            icon="thunderstorm-outline"
          />

          <SensorCard
            title="Motor Speed"
            value={sensorData.motorSpeed}
            unit="PWM"
            icon="speedometer-outline"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Vehicle location
        </Text>

        <View style={styles.locationCard}>
          <Ionicons
            name="location-outline"
            size={30}
            color="#16866F"
          />

          <View style={styles.locationDetails}>
            <Text
              style={styles.locationLabel}
            >
              GPS coordinates
            </Text>

            <Text style={styles.coordinates}>
              {sensorData.latitude},{' '}
              {sensorData.longitude}
            </Text>

            <Text style={styles.speedText}>
              Speed: {sensorData.speed} km/h
            </Text>

            <Text style={styles.speedText}>
              GPS fix:{' '}
              {sensorData.gpsValid === '1'
                ? 'Yes'
                : 'No'}
            </Text>

            <Text style={styles.speedText}>
              Satellites: {sensorData.satellites}
            </Text>
          </View>
        </View>

        {isConnected && lastRawData ? (
          <View style={styles.rawDataCard}>
            <Text style={styles.rawDataTitle}>
              Last BLE message
            </Text>

            <Text style={styles.rawDataText}>
              {lastRawData}
            </Text>
          </View>
        ) : null}

        <Text style={styles.footerText}>
          Live values will appear when the ESP32
          sends sensor notifications through BLE.
        </Text>
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
    marginBottom: 22,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#102A27',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#64748B',
  },
  connectionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#E3F5EF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  disconnectedBadge: {
    backgroundColor: '#F1F5F4',
  },
  connectionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#16866F',
    marginRight: 7,
  },
  disconnectedDot: {
    backgroundColor: '#94A3B8',
  },
  connectionText: {
    color: '#116B59',
    fontWeight: '700',
  },
  disconnectedText: {
    color: '#64748B',
  },
  bluetoothButton: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#16866F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 9,
    paddingHorizontal: 18,
  },
  disconnectButton: {
    backgroundColor: '#475569',
  },
  bluetoothButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  connectionHint: {
    marginTop: 9,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  airQualityCard: {
    backgroundColor: '#DFF4EB',
    borderRadius: 22,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  airQualityContent: {
    flex: 1,
    paddingRight: 12,
  },
  airQualityLabel: {
    color: '#527069',
    fontSize: 14,
  },
  airQualityStatus: {
    color: '#116B59',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 5,
  },
  airQualityDescription: {
    color: '#527069',
    marginTop: 6,
    lineHeight: 19,
  },
  airQualityModerateCard: {
    backgroundColor: '#FFF4CC',
  },
  airQualitySensitiveCard: {
    backgroundColor: '#FFE8CC',
  },
  airQualityPoorCard: {
    backgroundColor: '#FFE2E2',
  },
  airQualityOfflineCard: {
    backgroundColor: '#E9EEF1',
  },
  airQualityMetrics: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 10,
  },
  airQualityMetric: {
    minWidth: '44%',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 2,
    color: '#102A27',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#102A27',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  sensorCard: {
    width: '48%',
    minHeight: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F5F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensorTitle: {
    marginTop: 13,
    color: '#64748B',
    fontSize: 14,
  },
  valueRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sensorValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#102A27',
  },
  sensorUnit: {
    marginLeft: 5,
    marginBottom: 3,
    color: '#64748B',
    fontSize: 13,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 14,
  },
  locationLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  coordinates: {
    marginTop: 4,
    color: '#102A27',
    fontWeight: '700',
    fontSize: 15,
  },
  speedText: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
  },
  rawDataCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  rawDataTitle: {
    color: '#102A27',
    fontWeight: '800',
    fontSize: 14,
  },
  rawDataText: {
    marginTop: 7,
    color: '#64748B',
    lineHeight: 19,
    fontSize: 12,
  },
  footerText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 24,
    lineHeight: 20,
  },
});