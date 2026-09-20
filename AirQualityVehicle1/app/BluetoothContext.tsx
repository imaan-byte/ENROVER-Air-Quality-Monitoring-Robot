import { Buffer } from 'buffer';
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Alert } from 'react-native';
import {
    BleError,
    BleManager,
    Device,
    State,
    Subscription,
} from 'react-native-ble-plx';

const ENROVER_SERVICE_UUID =
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

const ENROVER_WRITE_CHARACTERISTIC_UUID =
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

const ENROVER_NOTIFY_CHARACTERISTIC_UUID =
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export type SensorData = {
  temperature: string;
  humidity: string;
  pressure: string;
  tvoc: string;
  eco2: string;

  pm1: string;
  pm25: string;
  pm10: string;

  latitude: string;
  longitude: string;
  speed: string;

  satellites: string;
  gpsValid: string;
  motorSpeed: string;
};

export type SensorSample = SensorData & {
  timestamp: number;
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: number;

  temperature: number;
  humidity: number;
  pressure: number;
  tvoc: number;
  eco2: number;

  pm1: number;
  pm25: number;
  pm10: number;

  speed: number;
};

type BluetoothContextType = {
  connectedDevice: Device | null;

  isConnected: boolean;
  isScanning: boolean;
  isControlReady: boolean;

  connectionMessage: string;

  sensorData: SensorData;
  sensorHistory: SensorSample[];
  lastRawData: string;

  sessionStartTime: number | null;
  sessionDurationSeconds: number;
  sampleCount: number;

  routePoints: RoutePoint[];
  isRouteRecording: boolean;

  automaticDataLogging: boolean;
  airQualityAlerts: boolean;

  connectToEnrover: () => Promise<void>;
  disconnectFromEnrover: () => Promise<void>;

  sendCommand: (command: string) => Promise<boolean>;

  startRouteRecording: () => void;
  stopRouteRecording: () => void;
  clearRoute: () => void;
  clearSession: () => void;

  setAutomaticDataLogging: (
    enabled: boolean,
  ) => void;

  setAirQualityAlerts: (
    enabled: boolean,
  ) => void;
};

const initialSensorData: SensorData = {
  temperature: '--',
  humidity: '--',
  pressure: '--',
  tvoc: '--',
  eco2: '--',

  pm1: '--',
  pm25: '--',
  pm10: '--',

  latitude: '--',
  longitude: '--',
  speed: '--',

  satellites: '--',
  gpsValid: '0',
  motorSpeed: '140',
};

const BluetoothContext =
  createContext<BluetoothContextType | null>(null);

const bleManager = new BleManager();

const MAX_HISTORY_SAMPLES = 300;
const MAX_ROUTE_POINTS = 500;

export function BluetoothProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [connectedDevice, setConnectedDevice] =
    useState<Device | null>(null);

  const [isScanning, setIsScanning] =
    useState(false);

  const [isControlReady, setIsControlReady] =
    useState(false);

  const [connectionMessage, setConnectionMessage] =
    useState('Disconnected');

  const [sensorData, setSensorData] =
    useState<SensorData>(initialSensorData);

  const [sensorHistory, setSensorHistory] =
    useState<SensorSample[]>([]);

  const [lastRawData, setLastRawData] =
    useState('');

  const [sessionStartTime, setSessionStartTime] =
    useState<number | null>(null);

  const [
    sessionDurationSeconds,
    setSessionDurationSeconds,
  ] = useState(0);

  const [routePoints, setRoutePoints] =
    useState<RoutePoint[]>([]);

  const [
    isRouteRecording,
    setIsRouteRecording,
  ] = useState(false);

  const [
    automaticDataLogging,
    setAutomaticDataLogging,
  ] = useState(true);

  const [airQualityAlerts, setAirQualityAlerts] =
    useState(true);

  const routeRecordingRef = useRef(false);
  const automaticLoggingRef = useRef(true);

  const scanTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const notificationSubscriptionRef =
    useRef<Subscription | null>(null);

  const disconnectionSubscriptionRef =
    useRef<Subscription | null>(null);

  useEffect(() => {
    routeRecordingRef.current =
      isRouteRecording;
  }, [isRouteRecording]);

  useEffect(() => {
    automaticLoggingRef.current =
      automaticDataLogging;
  }, [automaticDataLogging]);

  useEffect(() => {
    if (sessionStartTime === null) {
      setSessionDurationSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setSessionDurationSeconds(
        Math.floor(
          (Date.now() - sessionStartTime) /
            1000,
        ),
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [sessionStartTime]);

  useEffect(() => {
    const bluetoothStateSubscription =
      bleManager.onStateChange(
        state => {
          console.log(
            'Bluetooth state:',
            state,
          );
        },
        true,
      );

    return () => {
      clearScanTimeout();
      bleManager.stopDeviceScan();

      notificationSubscriptionRef.current?.remove();
      notificationSubscriptionRef.current =
        null;

      disconnectionSubscriptionRef.current?.remove();
      disconnectionSubscriptionRef.current =
        null;

      bluetoothStateSubscription.remove();
    };
  }, []);

  function clearScanTimeout() {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }

  async function waitForBluetooth(): Promise<void> {
    const currentState =
      await bleManager.state();

    if (currentState === State.PoweredOn) {
      return;
    }

    if (currentState === State.Unauthorized) {
      throw new Error(
        'Bluetooth permission is disabled. Enable Bluetooth access for ENROVER in iPhone Settings.',
      );
    }

    if (currentState === State.Unsupported) {
      throw new Error(
        'Bluetooth Low Energy is not supported on this device.',
      );
    }

    setConnectionMessage(
      'Waiting for Bluetooth',
    );

    return new Promise((resolve, reject) => {
      const subscription =
        bleManager.onStateChange(
          state => {
            if (state === State.PoweredOn) {
              subscription.remove();
              resolve();
              return;
            }

            if (
              state === State.PoweredOff ||
              state === State.Unauthorized ||
              state === State.Unsupported
            ) {
              subscription.remove();

              reject(
                new Error(
                  `Bluetooth unavailable: ${state}`,
                ),
              );
            }
          },
          true,
        );
    });
  }

  function normaliseSensorKey(
    key: string,
  ): keyof SensorData | null {
    const normalised = key
      .trim()
      .toLowerCase()
      .replace(/[\s_.-]/g, '');

    const keyMap: Record<
      string,
      keyof SensorData
    > = {
      temp: 'temperature',
      temperature: 'temperature',

      hum: 'humidity',
      humidity: 'humidity',

      press: 'pressure',
      pressure: 'pressure',

      tvoc: 'tvoc',

      eco2: 'eco2',
      co2: 'eco2',

      pm1: 'pm1',

      pm25: 'pm25',
      pm2: 'pm25',
      pm2p5: 'pm25',

      pm10: 'pm10',

      lat: 'latitude',
      latitude: 'latitude',

      lon: 'longitude',
      lng: 'longitude',
      longitude: 'longitude',

      speed: 'speed',
      gpsspeed: 'speed',

      sat: 'satellites',
      sats: 'satellites',
      satellite: 'satellites',
      satellites: 'satellites',

      gpsvalid: 'gpsValid',
      gpsfix: 'gpsValid',
      fix: 'gpsValid',

      pwm: 'motorSpeed',
      motorspeed: 'motorSpeed',
    };

    return keyMap[normalised] ?? null;
  }

  function parseSensorData(
    rawValue: string,
  ): Partial<SensorData> {
    const cleanedValue = rawValue.trim();

    if (!cleanedValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(cleanedValue);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        const result: Partial<SensorData> =
          {};

        Object.entries(parsed).forEach(
          ([key, value]) => {
            const sensorKey =
              normaliseSensorKey(key);

            if (
              sensorKey &&
              value !== null &&
              value !== undefined
            ) {
              result[sensorKey] =
                String(value);
            }
          },
        );

        return result;
      }
    } catch {
      // The message is not JSON.
    }

    const result: Partial<SensorData> = {};

    const fields = cleanedValue.split(
      /[,;\n|]+/,
    );

    fields.forEach(field => {
      const separatorIndex =
        field.search(/[:=]/);

      if (separatorIndex === -1) {
        return;
      }

      const rawKey = field
        .slice(0, separatorIndex)
        .trim();

      const rawDataValue = field
        .slice(separatorIndex + 1)
        .trim();

      const sensorKey =
        normaliseSensorKey(rawKey);

      if (sensorKey && rawDataValue) {
        result[sensorKey] =
          rawDataValue;
      }
    });

    return result;
  }

  function addRoutePoint(
    updatedData: SensorData,
  ) {
    if (!routeRecordingRef.current) {
      return;
    }

    const latitude = Number(
      updatedData.latitude,
    );

    const longitude = Number(
      updatedData.longitude,
    );

    if (
      updatedData.gpsValid !== '1' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      (latitude === 0 && longitude === 0)
    ) {
      return;
    }

    const toNumber = (
      value: string,
      fallback = 0,
    ) => {
      const parsed = Number(value);

      return Number.isFinite(parsed)
        ? parsed
        : fallback;
    };

    const nextPoint: RoutePoint = {
      latitude,
      longitude,
      timestamp: Date.now(),

      temperature: toNumber(
        updatedData.temperature,
      ),
      humidity: toNumber(
        updatedData.humidity,
      ),
      pressure: toNumber(
        updatedData.pressure,
      ),
      tvoc: toNumber(updatedData.tvoc),
      eco2: toNumber(updatedData.eco2),

      pm1: toNumber(updatedData.pm1),
      pm25: toNumber(updatedData.pm25),
      pm10: toNumber(updatedData.pm10),

      speed: toNumber(updatedData.speed),
    };

    setRoutePoints(previousPoints => {
      const lastPoint =
        previousPoints[
          previousPoints.length - 1
        ];

      if (lastPoint) {
        const coordinateUnchanged =
          lastPoint.latitude === latitude &&
          lastPoint.longitude === longitude;

        const pmUnchanged =
          lastPoint.pm25 === nextPoint.pm25;

        if (
          coordinateUnchanged &&
          pmUnchanged
        ) {
          return previousPoints;
        }
      }

      const nextPoints = [
        ...previousPoints,
        nextPoint,
      ];

      return nextPoints.slice(
        -MAX_ROUTE_POINTS,
      );
    });
  }

  function addHistorySample(
    updatedData: SensorData,
  ) {
    if (!automaticLoggingRef.current) {
      return;
    }

    const sample: SensorSample = {
      ...updatedData,
      timestamp: Date.now(),
    };

    setSensorHistory(previousHistory => {
      const nextHistory = [
        ...previousHistory,
        sample,
      ];

      return nextHistory.slice(
        -MAX_HISTORY_SAMPLES,
      );
    });
  }

  function handleIncomingSensorData(
    rawValue: string,
  ) {
    console.log(
      'ENROVER sensor data:',
      rawValue,
    );

    setLastRawData(rawValue);

    const parsedData =
      parseSensorData(rawValue);

    if (
      Object.keys(parsedData).length === 0
    ) {
      console.log(
        'No recognised sensor values were found.',
      );

      return;
    }

    setSensorData(previousData => {
      const updatedData: SensorData = {
        ...previousData,
        ...parsedData,
      };

      addHistorySample(updatedData);
      addRoutePoint(updatedData);

      return updatedData;
    });
  }

  function subscribeToSensorData(
    device: Device,
  ) {
    notificationSubscriptionRef.current?.remove();

    notificationSubscriptionRef.current =
      device.monitorCharacteristicForService(
        ENROVER_SERVICE_UUID,
        ENROVER_NOTIFY_CHARACTERISTIC_UUID,
        (
          error: BleError | null,
          characteristic,
        ) => {
          if (error) {
            const message =
              error.message.toLowerCase();

            const expectedCancellation =
              message.includes('cancel') ||
              message.includes('disconnect');

            if (expectedCancellation) {
              console.log(
                'BLE notification subscription ended normally.',
              );

              return;
            }

            console.warn(
              'BLE notification warning:',
              error.message,
            );

            return;
          }

          if (!characteristic?.value) {
            return;
          }

          try {
            const decodedValue = Buffer.from(
              characteristic.value,
              'base64',
            ).toString('utf8');

            handleIncomingSensorData(
              decodedValue,
            );
          } catch (decodeError) {
            console.warn(
              'Unable to decode BLE data:',
              decodeError,
            );
          }
        },
      );
  }

  async function connectToEnrover(): Promise<void> {
    if (connectedDevice) {
      Alert.alert(
        'Already connected',
        'ENROVER is already connected.',
      );

      return;
    }

    if (isScanning) {
      return;
    }

    let connectionStarted = false;

    try {
      setIsScanning(true);
      setIsControlReady(false);
      setConnectionMessage(
        'Starting Bluetooth',
      );

      await waitForBluetooth();

      setConnectionMessage(
        'Searching for ENROVER',
      );

      clearScanTimeout();
      bleManager.stopDeviceScan();

      scanTimeoutRef.current = setTimeout(
        () => {
          if (connectionStarted) {
            return;
          }

          bleManager.stopDeviceScan();

          setIsScanning(false);
          setConnectionMessage(
            'ENROVER not found',
          );

          Alert.alert(
            'ENROVER not found',
            'Make sure the ESP32 is switched on and nearby.',
          );
        },
        15000,
      );

      bleManager.startDeviceScan(
        null,
        {
          allowDuplicates: false,
        },
        async (
          error: BleError | null,
          device: Device | null,
        ) => {
          if (error) {
            clearScanTimeout();
            bleManager.stopDeviceScan();

            setIsScanning(false);
            setConnectionMessage(
              'Bluetooth scan failed',
            );

            Alert.alert(
              'Bluetooth error',
              error.message,
            );

            return;
          }

          if (!device || connectionStarted) {
            return;
          }

          const deviceName =
            device.name ??
            device.localName ??
            '';

          if (
            deviceName
              .trim()
              .toUpperCase() !== 'ENROVER'
          ) {
            return;
          }

          connectionStarted = true;

          clearScanTimeout();
          bleManager.stopDeviceScan();

          try {
            setConnectionMessage(
              'Connecting to ENROVER',
            );

            const connected =
              await device.connect({
                timeout: 15000,
              });

            const discovered =
              await connected.discoverAllServicesAndCharacteristics();

            setConnectedDevice(discovered);
            setIsScanning(false);
            setIsControlReady(true);
            setConnectionMessage('Connected');

            if (sessionStartTime === null) {
              setSessionStartTime(Date.now());
            }

            subscribeToSensorData(discovered);

            disconnectionSubscriptionRef.current?.remove();

            disconnectionSubscriptionRef.current =
              discovered.onDisconnected(
                (
                  disconnectError,
                  disconnectedDevice,
                ) => {
                  console.log(
                    'ENROVER disconnected:',
                    disconnectedDevice.name,
                    disconnectError?.message,
                  );

                  notificationSubscriptionRef.current?.remove();
                  notificationSubscriptionRef.current =
                    null;

                  setConnectedDevice(null);
                  setIsScanning(false);
                  setIsControlReady(false);
                  setConnectionMessage(
                    'Disconnected',
                  );

                  setIsRouteRecording(false);
                },
              );

            Alert.alert(
              'Connected',
              'ENROVER is connected. Live monitoring and vehicle controls are ready.',
            );
          } catch (connectionError) {
            const message =
              connectionError instanceof Error
                ? connectionError.message
                : 'Unable to connect.';

            setConnectedDevice(null);
            setIsScanning(false);
            setIsControlReady(false);
            setConnectionMessage(
              'Connection failed',
            );

            Alert.alert(
              'Connection failed',
              message,
            );
          }
        },
      );
    } catch (error) {
      clearScanTimeout();
      bleManager.stopDeviceScan();

      setConnectedDevice(null);
      setIsScanning(false);
      setIsControlReady(false);
      setConnectionMessage(
        'Bluetooth unavailable',
      );

      Alert.alert(
        'Bluetooth error',
        error instanceof Error
          ? error.message
          : 'Bluetooth could not be started.',
      );
    }
  }

  async function disconnectFromEnrover(): Promise<void> {
    if (!connectedDevice) {
      return;
    }

    try {
      clearScanTimeout();
      bleManager.stopDeviceScan();

      notificationSubscriptionRef.current?.remove();
      notificationSubscriptionRef.current =
        null;

      disconnectionSubscriptionRef.current?.remove();
      disconnectionSubscriptionRef.current =
        null;

      await bleManager.cancelDeviceConnection(
        connectedDevice.id,
      );

      setConnectedDevice(null);
      setIsScanning(false);
      setIsControlReady(false);
      setConnectionMessage('Disconnected');
      setIsRouteRecording(false);
    } catch (error) {
      Alert.alert(
        'Disconnect error',
        error instanceof Error
          ? error.message
          : 'Unable to disconnect.',
      );
    }
  }

  async function sendCommand(
    command: string,
  ): Promise<boolean> {
    if (!connectedDevice) {
      Alert.alert(
        'Not connected',
        'Connect to ENROVER before sending a command.',
      );

      return false;
    }

    const normalisedCommand =
      command.trim().toUpperCase();

    const allowedCommands = [
      'F',
      'B',
      'L',
      'R',
      'S',
      'A',
      '+',
      '-',
    ];

    if (
      !allowedCommands.includes(
        normalisedCommand,
      )
    ) {
      Alert.alert(
        'Invalid command',
        `The command ${normalisedCommand} is not supported.`,
      );

      return false;
    }

    try {
      const encodedCommand = Buffer.from(
        normalisedCommand,
        'utf8',
      ).toString('base64');

      await connectedDevice.writeCharacteristicWithResponseForService(
        ENROVER_SERVICE_UUID,
        ENROVER_WRITE_CHARACTERISTIC_UUID,
        encodedCommand,
      );

      console.log(
        `BLE command sent: ${normalisedCommand}`,
      );

      return true;
    } catch (error) {
      Alert.alert(
        'Command failed',
        error instanceof Error
          ? error.message
          : 'Unable to send the command.',
      );

      return false;
    }
  }

  function startRouteRecording() {
    if (!connectedDevice) {
      Alert.alert(
        'Not connected',
        'Connect to ENROVER before recording a route.',
      );

      return;
    }

    setIsRouteRecording(true);
  }

  function stopRouteRecording() {
    setIsRouteRecording(false);
  }

  function clearRoute() {
    setRoutePoints([]);
  }

  function clearSession() {
    setSensorHistory([]);
    setRoutePoints([]);
    setLastRawData('');
    setSessionStartTime(
      connectedDevice ? Date.now() : null,
    );
    setSessionDurationSeconds(0);
  }

  return (
    <BluetoothContext.Provider
      value={{
        connectedDevice,

        isConnected:
          connectedDevice !== null,

        isScanning,
        isControlReady,

        connectionMessage,

        sensorData,
        sensorHistory,
        lastRawData,

        sessionStartTime,
        sessionDurationSeconds,
        sampleCount: sensorHistory.length,

        routePoints,
        isRouteRecording,

        automaticDataLogging,
        airQualityAlerts,

        connectToEnrover,
        disconnectFromEnrover,

        sendCommand,

        startRouteRecording,
        stopRouteRecording,
        clearRoute,
        clearSession,

        setAutomaticDataLogging,
        setAirQualityAlerts,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context =
    useContext(BluetoothContext);

  if (!context) {
    throw new Error(
      'useBluetooth must be used inside BluetoothProvider.',
    );
  }

  return context;
}