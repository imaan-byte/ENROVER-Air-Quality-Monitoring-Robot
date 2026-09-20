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

import { useBluetooth } from '../BluetoothContext';

type DirectionCommand = 'F' | 'B' | 'L' | 'R';

type DirectionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  command: DirectionCommand;
  disabled: boolean;
  onCommandStart: (command: DirectionCommand) => void;
  onCommandStop: () => void;
};

function DirectionButton({
  icon,
  command,
  disabled,
  onCommandStart,
  onCommandStop,
}: DirectionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => onCommandStart(command)}
      onPressOut={onCommandStop}
      style={({ pressed }) => [
        styles.directionButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={34}
        color="#FFFFFF"
      />
    </Pressable>
  );
}

export default function ControlScreen() {
  const {
    isConnected,
    isScanning,
    isControlReady,
    connectionMessage,
    sendCommand,
  } = useBluetooth();

  const controlsDisabled =
    !isConnected || !isControlReady;

  async function handleCommandStart(
    command: DirectionCommand,
  ) {
    const commandSent = await sendCommand(command);

    if (commandSent) {
      console.log(
        `Vehicle movement started: ${command}`,
      );
    }
  }

  async function handleCommandStop() {
    if (controlsDisabled) {
      return;
    }

    const commandSent = await sendCommand('S');

    if (commandSent) {
      console.log('Vehicle stopped');
    }
  }

  async function handleEmergencyStop() {
    if (controlsDisabled) {
      Alert.alert(
        'Not connected',
        'Connect to ENROVER before sending vehicle commands.',
      );

      return;
    }

    await sendCommand('S');
  }

  async function startAutoPatrol() {
    if (controlsDisabled) {
      Alert.alert(
        'Not connected',
        'Connect to ENROVER before starting automatic patrol.',
      );

      return;
    }

    Alert.alert(
      'Start auto patrol?',
      'ENROVER will begin autonomous movement. Keep the vehicle within sight and be ready to press STOP.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start',
          onPress: async () => {
            const commandSent =
              await sendCommand('A');

            if (commandSent) {
              Alert.alert(
                'Auto patrol started',
                'Press the red STOP button to stop automatic movement.',
              );
            }
          },
        },
      ],
    );
  }

  const statusColour = isConnected
    ? '#16866F'
    : isScanning
      ? '#F59E0B'
      : '#94A3B8';

  const statusBackground = isConnected
    ? '#E3F5EF'
    : isScanning
      ? '#FFF4D6'
      : '#F1F5F4';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>
          Vehicle Control
        </Text>

        <Text style={styles.subtitle}>
          Press and hold a direction button to move the
          monitoring vehicle
        </Text>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: statusBackground,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusColour,
              },
            ]}
          />

          <View style={styles.statusDetails}>
            <Text style={styles.statusTitle}>
              Connection status
            </Text>

            <Text style={styles.statusValue}>
              {connectionMessage}
            </Text>

            {isConnected && (
              <Text style={styles.statusSubtext}>
                {isControlReady
                  ? 'Vehicle controls are ready'
                  : 'Preparing vehicle controls'}
              </Text>
            )}
          </View>

          <Ionicons
            name={
              isConnected
                ? 'bluetooth'
                : 'bluetooth-outline'
            }
            size={28}
            color={statusColour}
          />
        </View>

    
          
        <View style={styles.safetyNotice}>
          <Ionicons
            name="information-circle-outline"
            size={23}
            color="#116B59"
          />

          <Text style={styles.safetyText}>
            Movement continues while a direction button
            is held. Releasing it sends the STOP command.
          </Text>
        </View>

        <View style={styles.controls}>
          <DirectionButton
            icon="arrow-up"
            command="F"
            disabled={controlsDisabled}
            onCommandStart={handleCommandStart}
            onCommandStop={handleCommandStop}
          />

          <View style={styles.middleRow}>
            <DirectionButton
              icon="arrow-back"
              command="L"
              disabled={controlsDisabled}
              onCommandStart={handleCommandStart}
              onCommandStop={handleCommandStop}
            />

            <Pressable
              disabled={controlsDisabled}
              onPress={handleEmergencyStop}
              style={({ pressed }) => [
                styles.stopButton,
                controlsDisabled &&
                  styles.disabledButton,
                pressed &&
                  !controlsDisabled &&
                  styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="stop"
                size={34}
                color="#FFFFFF"
              />

              <Text style={styles.stopText}>
                STOP
              </Text>
            </Pressable>

            <DirectionButton
              icon="arrow-forward"
              command="R"
              disabled={controlsDisabled}
              onCommandStart={handleCommandStart}
              onCommandStop={handleCommandStop}
            />
          </View>

          <DirectionButton
            icon="arrow-down"
            command="B"
            disabled={controlsDisabled}
            onCommandStart={handleCommandStart}
            onCommandStop={handleCommandStop}
          />
        </View>

        {!isConnected && (
          <View style={styles.offlineMessage}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color="#64748B"
            />

            <Text style={styles.offlineText}>
              Connect to ENROVER to enable the controls.
            </Text>
          </View>
        )}

        <View style={styles.commandGuide}>
          <Text style={styles.guideTitle}>
            Commands sent to ESP32
          </Text>

          <Text style={styles.guideText}>
            F = forward · B = backward · L = left · R =
            right · S = stop · A = auto patrol
          </Text>
        </View>

        <Pressable
          disabled={controlsDisabled}
          onPress={startAutoPatrol}
          style={({ pressed }) => [
            styles.autoButton,
            controlsDisabled &&
              styles.disabledAutoButton,
            pressed &&
              !controlsDisabled &&
              styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="navigate-outline"
            size={23}
            color={
              controlsDisabled
                ? '#94A3B8'
                : '#16866F'
            }
          />

          <Text
            style={[
              styles.autoButtonText,
              controlsDisabled &&
                styles.disabledAutoButtonText,
            ]}
          >
            Auto patrol mode
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
    flexGrow: 1,
    padding: 22,
    paddingBottom: 120,
  },
  heading: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '800',
    color: '#102A27',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
  },
  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginRight: 13,
  },
  statusDetails: {
    flex: 1,
  },
  statusTitle: {
    color: '#64748B',
    fontSize: 13,
  },
  statusValue: {
    marginTop: 3,
    color: '#102A27',
    fontSize: 17,
    fontWeight: '800',
  },
  statusSubtext: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
  },
  connectionButton: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#16866F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 9,
    paddingHorizontal: 18,
  },
  disconnectButton: {
    backgroundColor: '#475569',
  },
  disabledConnectionButton: {
    opacity: 0.65,
  },
  connectionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  safetyNotice: {
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: '#E3F5EF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  safetyText: {
    flex: 1,
    marginLeft: 10,
    color: '#527069',
    lineHeight: 19,
    fontSize: 13,
  },
  controls: {
    alignItems: 'center',
    marginTop: 38,
    rowGap: 18,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 18,
  },
  directionButton: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#16866F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 95,
    height: 95,
    borderRadius: 30,
    backgroundColor: '#DC4C4C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  buttonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  disabledButton: {
    opacity: 0.3,
  },
  offlineMessage: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    marginLeft: 8,
    color: '#64748B',
    fontSize: 13,
  },
  commandGuide: {
    marginTop: 35,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A27',
  },
  guideText: {
    marginTop: 7,
    color: '#64748B',
    lineHeight: 20,
  },
  autoButton: {
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: '#16866F',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 9,
  },
  autoButtonText: {
    color: '#16866F',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledAutoButton: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F4',
  },
  disabledAutoButtonText: {
    color: '#94A3B8',
  },
});