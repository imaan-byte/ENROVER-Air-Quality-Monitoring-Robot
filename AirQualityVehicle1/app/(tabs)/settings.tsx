
import { Ionicons } from '@expo/vector-icons';
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { useBluetooth } from '../BluetoothContext';

type SettingsItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress?: () => void;
  disabled?: boolean;
  showArrow?: boolean;
};

function SettingsItem({
  icon,
  title,
  description,
  onPress,
  disabled = false,
  showArrow = true,
}: SettingsItemProps) {
  return (
    <Pressable
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        disabled && styles.disabledItem,
        pressed &&
          !disabled &&
          onPress &&
          styles.pressed,
      ]}
    >
      <View style={styles.itemIcon}>
        <Ionicons
          name={icon}
          size={22}
          color="#16866F"
        />
      </View>

      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>
          {title}
        </Text>

        <Text style={styles.itemDescription}>
          {description}
        </Text>
      </View>

      {showArrow && onPress ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#94A3B8"
        />
      ) : null}
    </Pressable>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minutes`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

export default function SettingsScreen() {
  const {
    isConnected,
    connectionMessage,
    sensorData,
    sensorHistory,
    sampleCount,
    sessionDurationSeconds,
    routePoints,

    automaticDataLogging,
    airQualityAlerts,

    setAutomaticDataLogging,
    setAirQualityAlerts,

    clearSession,
  } = useBluetooth();

  const bluetoothDescription = isConnected
    ? `Connected to ENROVER — ${connectionMessage}`
    : 'Disconnected — connect from the Dashboard';

  const gpsDescription =
    sensorData.gpsValid === '1'
      ? `${sensorData.satellites} satellites · ${sensorData.speed} km/h`
      : 'Waiting for a valid GPS fix';

  async function exportCollectedData() {
    if (sensorHistory.length === 0) {
      Alert.alert(
        'No recorded data',
        'Connect to ENROVER and collect some readings before exporting.',
      );

      return;
    }

    const header = [
      'timestamp',
      'temperature_c',
      'humidity_percent',
      'pressure_hpa',
      'tvoc_ppb',
      'eco2_ppm',
      'pm1_ug_m3',
      'pm25_ug_m3',
      'pm10_ug_m3',
      'latitude',
      'longitude',
      'speed_kmh',
      'satellites',
      'gps_valid',
      'motor_pwm',
    ].join(',');

    const rows = sensorHistory.map(sample =>
      [
        new Date(
          sample.timestamp,
        ).toISOString(),
        sample.temperature,
        sample.humidity,
        sample.pressure,
        sample.tvoc,
        sample.eco2,
        sample.pm1,
        sample.pm25,
        sample.pm10,
        sample.latitude,
        sample.longitude,
        sample.speed,
        sample.satellites,
        sample.gpsValid,
        sample.motorSpeed,
      ]
        .map(value =>
          String(value).replace(/,/g, ' '),
        )
        .join(','),
    );

    const csvData = [
      header,
      ...rows,
    ].join('\n');

    try {
      await Share.share({
        title:
          'ENROVER environmental monitoring data',
        message: csvData,
      });
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error
          ? error.message
          : 'The collected data could not be exported.',
      );
    }
  }

  function confirmClearSession() {
    if (
      sensorHistory.length === 0 &&
      routePoints.length === 0
    ) {
      Alert.alert(
        'No recorded data',
        'There is currently no monitoring data to clear.',
      );

      return;
    }

    Alert.alert(
      'Clear recorded data?',
      'This will remove the current sensor history and recorded route.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearSession,
        },
      ],
    );
  }

  function showSamplingInformation() {
    Alert.alert(
      'Sampling interval',
      'The ESP32 currently reads and sends environmental measurements every 2 seconds. This interval is controlled in the Arduino sketch by SENSOR_INTERVAL_MS.',
    );
  }

  function showSpeedInformation() {
    Alert.alert(
      'Rover speed',
      `The current PWM motor-speed value reported by the ESP32 is ${sensorData.motorSpeed}. The valid ESP32 PWM range is 0 to 255.`,
    );
  }

  function showBluetoothInformation() {
    Alert.alert(
      'Bluetooth connection',
      isConnected
        ? 'ENROVER is connected. This single connection is shared by the Dashboard, Rover, Map, Analytics and Settings pages.'
        : 'Return to the Dashboard and press Connect to ENROVER. The connection will then be shared automatically across the entire app.',
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>
            ENROVER
          </Text>

          <Text style={styles.heading}>
            Settings
          </Text>

          <Text style={styles.subtitle}>
            Configure the monitoring platform
          </Text>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}>
            <Ionicons
              name="car-sport"
              size={34}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.vehicleDetails}>
            <Text style={styles.vehicleName}>
              ENROVER-01
            </Text>

            <Text
              style={styles.vehicleDescription}
            >
              Low-cost IoT environmental monitoring
              rover
            </Text>

            <View style={styles.vehicleStatusRow}>
              <View
                style={[
                  styles.vehicleStatusDot,
                  {
                    backgroundColor: isConnected
                      ? '#16866F'
                      : '#94A3B8',
                  },
                ]}
              />

              <Text
                style={[
                  styles.vehicleStatusText,
                  {
                    color: isConnected
                      ? '#116B59'
                      : '#64748B',
                  },
                ]}
              >
                {isConnected
                  ? 'Connected'
                  : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Vehicle connection
        </Text>

        <SettingsItem
          icon="bluetooth-outline"
          title="Bluetooth connection"
          description={bluetoothDescription}
          onPress={showBluetoothInformation}
        />

        <SettingsItem
          icon="radio-outline"
          title="GPS status"
          description={gpsDescription}
          showArrow={false}
        />

        <SettingsItem
          icon="timer-outline"
          title="Sampling interval"
          description="Current interval: 2 seconds"
          onPress={showSamplingInformation}
        />

        <SettingsItem
          icon="speedometer-outline"
          title="Current rover speed"
          description={`PWM setting: ${sensorData.motorSpeed}`}
          onPress={showSpeedInformation}
        />

        <Text style={styles.sectionTitle}>
          Monitoring session
        </Text>

        <View style={styles.sessionCard}>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>
              Duration
            </Text>

            <Text style={styles.sessionValue}>
              {formatDuration(
                sessionDurationSeconds,
              )}
            </Text>
          </View>

          <View style={styles.sessionDivider} />

          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>
              Samples
            </Text>

            <Text style={styles.sessionValue}>
              {sampleCount}
            </Text>
          </View>

          <View style={styles.sessionDivider} />

          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>
              Route points
            </Text>

            <Text style={styles.sessionValue}>
              {routePoints.length}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Data collection
        </Text>

        <View style={styles.toggleItem}>
          <View style={styles.itemIcon}>
            <Ionicons
              name="save-outline"
              size={22}
              color="#16866F"
            />
          </View>

          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>
              Automatic data logging
            </Text>

            <Text
              style={styles.itemDescription}
            >
              Save each live BLE reading to the
              current monitoring session
            </Text>
          </View>

          <Switch
            value={automaticDataLogging}
            onValueChange={
              setAutomaticDataLogging
            }
            trackColor={{
              false: '#CBD5E1',
              true: '#A6D8CB',
            }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#CBD5E1"
          />
        </View>

        <View style={styles.toggleItem}>
          <View style={styles.itemIcon}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#16866F"
            />
          </View>

          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>
              Air-quality alerts
            </Text>

            <Text
              style={styles.itemDescription}
            >
              Enable warnings when pollution
              measurements become elevated
            </Text>
          </View>

          <Switch
            value={airQualityAlerts}
            onValueChange={setAirQualityAlerts}
            trackColor={{
              false: '#CBD5E1',
              true: '#A6D8CB',
            }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#CBD5E1"
          />
        </View>

        <SettingsItem
          icon="document-text-outline"
          title="Export collected data"
          description={
            sampleCount > 0
              ? `Export ${sampleCount} recorded samples as CSV`
              : 'No environmental samples recorded yet'
          }
          onPress={exportCollectedData}
          disabled={sampleCount === 0}
        />

        <SettingsItem
          icon="trash-outline"
          title="Clear recorded data"
          description="Remove the current sensor history and GPS route"
          onPress={confirmClearSession}
        />

        <Text style={styles.sectionTitle}>
          About ENROVER
        </Text>

        <View style={styles.environmentCard}>
          <View style={styles.environmentIcon}>
            <Ionicons
              name="leaf-outline"
              size={30}
              color="#16866F"
            />
          </View>

          <View style={styles.environmentText}>
            <Text
              style={styles.environmentTitle}
            >
              Why environmental monitoring matters
            </Text>

            <Text
              style={
                styles.environmentDescription
              }
            >
              Clean air is essential for human
              health, wildlife and healthy
              communities. Pollution can vary between
              streets and locations, meaning one
              fixed monitoring station may not show
              the full picture.
            </Text>

            <Text
              style={
                styles.environmentDescription
              }
            >
              ENROVER combines mobile sensors, GPS
              and Bluetooth communication to collect
              location-based measurements. This helps
              identify how environmental conditions
              change as the rover moves through
              different areas.
            </Text>
          </View>
        </View>

        <View style={styles.systemCard}>
          <Text style={styles.systemTitle}>
            ENROVER system
          </Text>

          <View style={styles.systemRow}>
            <Ionicons
              name="hardware-chip-outline"
              size={21}
              color="#16866F"
            />

            <Text style={styles.systemText}>
              ESP32 controller and BLE communication
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Ionicons
              name="thermometer-outline"
              size={21}
              color="#16866F"
            />

            <Text style={styles.systemText}>
              BME280 temperature, humidity and pressure
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Ionicons
              name="cloud-outline"
              size={21}
              color="#16866F"
            />

            <Text style={styles.systemText}>
              SGP30 TVOC and eCO₂ monitoring
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Ionicons
              name="navigate-outline"
              size={21}
              color="#16866F"
            />

            <Text style={styles.systemText}>
              GPS-based location and route recording
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Ionicons
              name="partly-sunny-outline"
              size={21}
              color="#16866F"
            />

            <Text style={styles.systemText}>
              PMS5003 particulate monitoring when connected
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Project information
        </Text>

        <View style={styles.projectCard}>
          <Text style={styles.projectTitle}>
            Engineering Project
          </Text>

          <Text style={styles.projectText}>
            Design and Evaluation of a Low-Cost
            IoT-Enabled Autonomous Vehicle for
            Real-Time Air Quality Monitoring
          </Text>

          <View style={styles.divider} />

          <Text style={styles.studentName}>
            Imaan Soliman
          </Text>

          <Text style={styles.studentNumber}>
            Student ID: 22847545
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
  vehicleCard: {
    borderRadius: 22,
    backgroundColor: '#DFF4EB',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: '#16866F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleDetails: {
    flex: 1,
    marginLeft: 15,
  },
  vehicleName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#102A27',
  },
  vehicleDescription: {
    marginTop: 5,
    lineHeight: 18,
    color: '#527069',
  },
  vehicleStatusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  vehicleStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#102A27',
  },
  settingsItem: {
    minHeight: 78,
    paddingHorizontal: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledItem: {
    opacity: 0.5,
  },
  toggleItem: {
    minHeight: 88,
    paddingHorizontal: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#E7F4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A27',
  },
  itemDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
  },
  sessionCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sessionLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  sessionValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '800',
    color: '#102A27',
    textAlign: 'center',
  },
  sessionDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#E2E8F0',
  },
  environmentCard: {
    borderRadius: 20,
    backgroundColor: '#DFF4EB',
    padding: 18,
    flexDirection: 'row',
  },
  environmentIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  environmentText: {
    flex: 1,
    marginLeft: 14,
  },
  environmentTitle: {
    color: '#102A27',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  environmentDescription: {
    marginTop: 8,
    color: '#527069',
    fontSize: 13,
    lineHeight: 20,
  },
  systemCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  systemTitle: {
    color: '#102A27',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  systemRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemText: {
    flex: 1,
    marginLeft: 11,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  projectCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 19,
  },
  projectTitle: {
    color: '#16866F',
    fontWeight: '800',
    fontSize: 14,
  },
  projectText: {
    marginTop: 7,
    color: '#102A27',
    fontWeight: '700',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 15,
  },
  studentName: {
    color: '#102A27',
    fontWeight: '800',
  },
  studentNumber: {
    marginTop: 4,
    color: '#64748B',
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.99 }],
  },
});