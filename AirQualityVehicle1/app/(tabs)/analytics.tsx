import { Ionicons } from '@expo/vector-icons';
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    SensorSample,
    useBluetooth,
} from '../BluetoothContext';

type HistoryKey =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'tvoc'
  | 'eco2'
  | 'pm1'
  | 'pm25'
  | 'pm10';

type ChartCardProps = {
  title: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  values: number[];
  decimals?: number;
};

function parseReading(value: string): number | null {
  if (!value || value === '--') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getHistoryValues(
  history: SensorSample[],
  key: HistoryKey,
): number[] {
  return history
    .map(sample => parseReading(sample[key]))
    .filter(
      (value): value is number =>
        value !== null,
    );
}

function createBarHeights(values: number[]): number[] {
  if (values.length === 0) {
    return Array(10).fill(10);
  }

  const latestValues = values.slice(-10);
  const minimum = Math.min(...latestValues);
  const maximum = Math.max(...latestValues);
  const range = maximum - minimum;

  const heights = latestValues.map(value => {
    if (range === 0) {
      return 48;
    }

    return (
      22 +
      ((value - minimum) / range) * 58
    );
  });

  while (heights.length < 10) {
    heights.unshift(10);
  }

  return heights;
}

function calculateChange(
  values: number[],
  unit: string,
  decimals: number,
): string {
  if (values.length < 2) {
    return 'Waiting';
  }

  const firstValue = values[0];
  const latestValue =
    values[values.length - 1];

  const change = latestValue - firstValue;

  if (Math.abs(change) < 0.01) {
    return 'Stable';
  }

  return `${change > 0 ? '+' : ''}${change.toFixed(
    decimals,
  )}${unit}`;
}

function formatSessionDuration(
  durationSeconds: number,
): string {
  if (durationSeconds < 60) {
    return `${durationSeconds} sec`;
  }

  const minutes = Math.floor(
    durationSeconds / 60,
  );

  const seconds = durationSeconds % 60;

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}m ${seconds}s`;
}

function ChartCard({
  title,
  value,
  unit,
  icon,
  values,
  decimals = 1,
}: ChartCardProps) {
  const bars = createBarHeights(values);

  const change = calculateChange(
    values,
    unit,
    decimals,
  );

  const minimum =
    values.length > 0
      ? Math.min(...values)
      : null;

  const maximum =
    values.length > 0
      ? Math.max(...values)
      : null;

  const average =
    values.length > 0
      ? values.reduce(
          (total, reading) =>
            total + reading,
          0,
        ) / values.length
      : null;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Ionicons
              name={icon}
              size={21}
              color="#16866F"
            />
          </View>

          <View>
            <Text style={styles.chartTitle}>
              {title}
            </Text>

            <View style={styles.valueRow}>
              <Text style={styles.chartValue}>
                {value}
              </Text>

              <Text style={styles.unit}>
                {unit}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.change}>
          {change}
        </Text>
      </View>

      <View style={styles.chartArea}>
        {bars.map((height, index) => (
          <View
            key={`${title}-${index}`}
            style={[
              styles.chartBar,
              {
                height,
                opacity:
                  0.4 + index * 0.055,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>
          Earlier
        </Text>

        <Text style={styles.chartLabel}>
          Latest readings
        </Text>
      </View>

      <View style={styles.statisticsRow}>
        <View style={styles.statisticItem}>
          <Text style={styles.statisticLabel}>
            Minimum
          </Text>

          <Text style={styles.statisticValue}>
            {minimum === null
              ? '--'
              : minimum.toFixed(decimals)}
          </Text>
        </View>

        <View style={styles.statisticDivider} />

        <View style={styles.statisticItem}>
          <Text style={styles.statisticLabel}>
            Average
          </Text>

          <Text style={styles.statisticValue}>
            {average === null
              ? '--'
              : average.toFixed(decimals)}
          </Text>
        </View>

        <View style={styles.statisticDivider} />

        <View style={styles.statisticItem}>
          <Text style={styles.statisticLabel}>
            Maximum
          </Text>

          <Text style={styles.statisticValue}>
            {maximum === null
              ? '--'
              : maximum.toFixed(decimals)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const {
    isConnected,
    sensorData,
    sensorHistory,
    sampleCount,
    sessionDurationSeconds,
    clearSession,
  } = useBluetooth();

  const temperatureValues =
    getHistoryValues(
      sensorHistory,
      'temperature',
    );

  const humidityValues =
    getHistoryValues(
      sensorHistory,
      'humidity',
    );

  const pressureValues =
    getHistoryValues(
      sensorHistory,
      'pressure',
    );

  const tvocValues =
    getHistoryValues(
      sensorHistory,
      'tvoc',
    );

  const eco2Values =
    getHistoryValues(
      sensorHistory,
      'eco2',
    );

  const pm1Values =
    getHistoryValues(
      sensorHistory,
      'pm1',
    );

  const pm25Values =
    getHistoryValues(
      sensorHistory,
      'pm25',
    );

  const pm10Values =
    getHistoryValues(
      sensorHistory,
      'pm10',
    );

  const particulateMatterAvailable =
    pm1Values.length > 0 ||
    pm25Values.length > 0 ||
    pm10Values.length > 0;

  async function exportSessionAsCsv() {
    if (sensorHistory.length === 0) {
      Alert.alert(
        'No data available',
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
          String(value).replace(
            /,/g,
            ' ',
          ),
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
          : 'The monitoring data could not be exported.',
      );
    }
  }

  function handleClearSession() {
    if (sensorHistory.length === 0) {
      Alert.alert(
        'No recorded data',
        'There is currently no session data to clear.',
      );

      return;
    }

    Alert.alert(
      'Clear monitoring session?',
      'This will remove the current analytics history and recorded route.',
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
            Analytics
          </Text>

          <Text style={styles.subtitle}>
            Environmental trends and recorded measurements
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
              {isConnected
                ? 'Live monitoring'
                : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>
              Monitoring session
            </Text>

            <Text style={styles.summaryValue}>
              {formatSessionDuration(
                sessionDurationSeconds,
              )}
            </Text>

            <Text
              style={styles.summaryDescription}
            >
              {sampleCount} environmental samples recorded
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Ionicons
              name="pulse-outline"
              size={34}
              color="#16866F"
            />
          </View>
        </View>

        <ChartCard
          title="Temperature"
          value={sensorData.temperature}
          unit="°C"
          icon="thermometer-outline"
          values={temperatureValues}
          decimals={1}
        />

        <ChartCard
          title="Humidity"
          value={sensorData.humidity}
          unit="%"
          icon="water-outline"
          values={humidityValues}
          decimals={1}
        />

        <ChartCard
          title="Pressure"
          value={sensorData.pressure}
          unit="hPa"
          icon="speedometer-outline"
          values={pressureValues}
          decimals={1}
        />

        <ChartCard
          title="TVOC"
          value={sensorData.tvoc}
          unit="ppb"
          icon="cloud-outline"
          values={tvocValues}
          decimals={0}
        />

        <ChartCard
          title="eCO₂"
          value={sensorData.eco2}
          unit="ppm"
          icon="analytics-outline"
          values={eco2Values}
          decimals={0}
        />

        {particulateMatterAvailable ? (
          <>
            <Text style={styles.sectionTitle}>
              Particulate matter
            </Text>

            <ChartCard
              title="PM1.0"
              value={sensorData.pm1}
              unit="µg/m³"
              icon="partly-sunny-outline"
              values={pm1Values}
              decimals={0}
            />

            <ChartCard
              title="PM2.5"
              value={sensorData.pm25}
              unit="µg/m³"
              icon="partly-sunny-outline"
              values={pm25Values}
              decimals={0}
            />

            <ChartCard
              title="PM10"
              value={sensorData.pm10}
              unit="µg/m³"
              icon="partly-sunny-outline"
              values={pm10Values}
              decimals={0}
            />
          </>
        ) : (
          <View style={styles.pmPlaceholder}>
            <Ionicons
              name="partly-sunny-outline"
              size={30}
              color="#16866F"
            />

            <View style={styles.pmText}>
              <Text style={styles.pmTitle}>
                Particulate matter analytics
              </Text>

              <Text
                style={styles.pmDescription}
              >
                PM1.0, PM2.5 and PM10 graphs will
                activate when the PMS5003 is
                connected and sending readings.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.sessionInformationCard}>
          <Ionicons
            name="information-circle-outline"
            size={25}
            color="#16866F"
          />

          <Text
            style={styles.sessionInformationText}
          >
            The graphs display the most recent
            measurements collected through Bluetooth.
            Minimum, average and maximum values are
            calculated from the current monitoring
            session.
          </Text>
        </View>

        <Pressable
          onPress={exportSessionAsCsv}
          style={({ pressed }) => [
            styles.exportButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="download-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.exportText}>
            Export session as CSV
          </Text>
        </Pressable>

        <Pressable
          onPress={handleClearSession}
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
            Clear monitoring session
          </Text>
        </Pressable>
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
  summaryCard: {
    padding: 21,
    borderRadius: 22,
    backgroundColor: '#DFF4EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryContent: {
    flex: 1,
    paddingRight: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#527069',
  },
  summaryValue: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: '800',
    color: '#116B59',
  },
  summaryDescription: {
    marginTop: 5,
    color: '#527069',
  },
  summaryIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginTop: 25,
    marginBottom: 2,
    fontSize: 18,
    fontWeight: '800',
    color: '#102A27',
  },
  chartCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#E7F4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chartTitle: {
    fontSize: 13,
    color: '#64748B',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  chartValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#102A27',
  },
  unit: {
    marginLeft: 5,
    marginBottom: 3,
    color: '#64748B',
  },
  change: {
    color: '#16866F',
    fontWeight: '800',
    fontSize: 13,
  },
  chartArea: {
    height: 90,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E4ECEA',
  },
  chartBar: {
    width: '7%',
    minHeight: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#16866F',
  },
  chartLabels: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statisticsRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E4ECEA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statisticItem: {
    flex: 1,
    alignItems: 'center',
  },
  statisticLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statisticValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#102A27',
  },
  statisticDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  pmPlaceholder: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pmText: {
    flex: 1,
    marginLeft: 14,
  },
  pmTitle: {
    fontWeight: '800',
    color: '#102A27',
  },
  pmDescription: {
    marginTop: 5,
    lineHeight: 19,
    color: '#64748B',
  },
  sessionInformationCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#E3F5EF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sessionInformationText: {
    flex: 1,
    marginLeft: 10,
    color: '#527069',
    lineHeight: 19,
    fontSize: 13,
  },
  exportButton: {
    marginTop: 18,
    borderRadius: 17,
    paddingVertical: 16,
    backgroundColor: '#16866F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 9,
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  clearButton: {
    marginTop: 12,
    borderRadius: 17,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  clearButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});