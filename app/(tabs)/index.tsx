import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { format, subDays } from 'date-fns';

import { useHistoryStore } from '@/store/useHistoryStore';
import { useReminderStore } from '@/store/useReminderStore';
import { useWaterStore } from '@/store/useWaterStore';
import { sipupColors, sipupImages, sipupShadow } from '@/constants/sipup-ui';

const RING_SIZE = 286;
const STROKE_WIDTH = 16;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type GoalEditorProps = {
  goal: number;
  onClose: () => void;
  onSave: (value: number) => void;
  visible: boolean;
};

function GoalEditor({ goal, onClose, onSave, visible }: GoalEditorProps) {
  const [value, setValue] = useState(String(goal));

  useEffect(() => {
    if (visible) {
      setValue(String(goal));
    }
  }, [goal, visible]);

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Update Daily Target</Text>
              <Text style={styles.modalCopy}>
                Tap the target chip anytime to adjust your daily hydration goal.
              </Text>
              <TextInput
                autoFocus
                keyboardType="number-pad"
                maxLength={5}
                onChangeText={setValue}
                selectionColor={sipupColors.primary}
                style={styles.modalInput}
                value={value}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={onClose} style={styles.modalGhostButton}>
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const nextGoal = Number.parseInt(value, 10);
                    if (Number.isFinite(nextGoal) && nextGoal > 0) {
                      onSave(nextGoal);
                    }
                  }}
                  style={styles.modalPrimaryButton}>
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function QuickLogButton({
  amount,
  icon,
  onPress,
}: {
  amount: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickLogButton}>
      <MaterialCommunityIcons color={sipupColors.primary} name={icon} size={28} />
      <Text style={styles.quickLogText}>+{amount}ml</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const intake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
  const addWater = useWaterStore((state) => state.addWater);
  const updateGoal = useWaterStore((state) => state.updateGoal);
  const checkNewDay = useWaterStore((state) => state.checkNewDay);
  const history = useHistoryStore((state) => state.history);
  const streak = useHistoryStore((state) => state.streak);
  const nextReminderTime = useReminderStore((state) => state.nextReminderTime);
  const remindersEnabled = useReminderStore((state) => state.remindersEnabled);

  const [goalEditorVisible, setGoalEditorVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    checkNewDay();
  }, [checkNewDay]);

  // Live countdown timer — refreshes every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const nextReminderLabel = useMemo(() => {
    if (!remindersEnabled) return 'Paused';
    if (nextReminderTime === null) return 'Setting up...';

    const diffMs = nextReminderTime - now;
    if (diffMs <= 0) return 'Any moment now';

    const diffMin = Math.ceil(diffMs / 60_000);
    if (diffMin >= 60) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
    }
    return `in ${diffMin} min`;
  }, [nextReminderTime, now, remindersEnabled]);

  const progress = Math.min(goal > 0 ? intake / goal : 0, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }, []);

  const weeklyBars = useMemo(() => {
    const historyMap = new Map(history.map((item) => [item.date, item]));
    const baseline = [1500, 1900, 1200, 2200, 0, 1400, intake];

    return Array.from({ length: 7 }, (_, index) => {
      const day = subDays(new Date(), 6 - index);
      const dateKey = format(day, 'yyyy-MM-dd');
      const record = historyMap.get(dateKey);
      const amount = index === 6 ? intake : record?.intake ?? baseline[index];
      const height = amount > 0 ? Math.max(42, (amount / Math.max(goal, 3000)) * 124) : 0;

      return {
        amount,
        dateKey,
        height,
        isToday: index === 6,
        label: format(day, 'EEEEE'),
      };
    });
  }, [goal, history, intake]);

  const weeklyCompletion = useMemo(() => {
    const ratioSum = weeklyBars.reduce((sum, item) => {
      return sum + Math.min(item.amount / Math.max(goal, 1), 1);
    }, 0);

    return ratioSum / weeklyBars.length;
  }, [goal, weeklyBars]);

  const insightPercentile = weeklyCompletion >= 0.95 ? 10 : weeklyCompletion >= 0.8 ? 18 : weeklyCompletion >= 0.65 ? 27 : 42;
  const fluidBalanceLabel = progress >= 0.85 ? 'Optimal' : progress >= 0.6 ? 'Balanced' : 'Low';

  const handleQuickLog = (amount: number) => {
    addWater(amount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSnackbarText(`Logged ${amount} mL`);
    setSnackbarVisible(true);
  };

  const handleSaveGoal = (nextGoal: number) => {
    updateGoal(nextGoal);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGoalEditorVisible(false);
    setSnackbarText(`Target updated to ${nextGoal} mL`);
    setSnackbarVisible(true);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 22,
            paddingBottom: insets.bottom + 148,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>{greeting}</Text>
            <Text style={styles.headerTitle}>{"Today's Hydration"}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable hitSlop={10} style={styles.headerIcon}>
              <MaterialIcons color={sipupColors.primary} name="notifications" size={24} />
            </Pressable>

            <View style={styles.headerAvatar}>
              <Image
                contentFit="cover"
                source={{ uri: sipupImages.dashboardAvatar }}
                style={styles.headerAvatarImage}
              />
            </View>
          </View>
        </View>

        <View style={styles.ringSection}>
          <View style={styles.ringWrap}>
            <Svg height={RING_SIZE} width={RING_SIZE}>
              <Defs>
                <LinearGradient id="intakeGradient" x1="15%" x2="85%" y1="90%" y2="10%">
                  <Stop offset="0%" stopColor={sipupColors.teal} />
                  <Stop offset="100%" stopColor={sipupColors.primary} />
                </LinearGradient>
              </Defs>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill="none"
                r={RADIUS}
                stroke="#ebe8ed"
                strokeWidth={STROKE_WIDTH}
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill="none"
                r={RADIUS}
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                stroke="url(#intakeGradient)"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth={STROKE_WIDTH}
              />
            </Svg>

            <View style={styles.ringCenter}>
              <Text style={styles.intakeValue}>{intake.toLocaleString()}</Text>
              <Text style={styles.intakeLabel}>ML INTAKE</Text>

              <Pressable onPress={() => setGoalEditorVisible(true)} style={styles.targetChip}>
                <Text style={styles.targetChipText}>Target: {goal.toLocaleString()} mL</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>QUICK LOG</Text>
        </View>

        <View style={styles.quickLogGrid}>
          <QuickLogButton amount={250} icon="cup-water" onPress={() => handleQuickLog(250)} />
          <QuickLogButton
            amount={500}
            icon="bottle-tonic-plus-outline"
            onPress={() => handleQuickLog(500)}
          />
        </View>

        <View style={styles.nextReminderRow}>
          <MaterialIcons color={sipupColors.teal} name="notifications-active" size={18} />
          <Text style={styles.nextReminderText}>Next reminder {nextReminderLabel}</Text>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightIntro}>
            <View style={styles.insightTag}>
              <MaterialIcons color={sipupColors.teal} name="bolt" size={20} />
              <Text style={styles.insightTagText}>PERFORMANCE INSIGHT</Text>
            </View>

            <Text style={styles.insightTitle}>
              You are in the <Text style={styles.insightHighlight}>top {insightPercentile}%</Text> of
              your hydration goal this week.
            </Text>
            <Text style={styles.insightCopy}>Consistency is key to recovery.</Text>
          </View>

          <View style={styles.barChart}>
            {weeklyBars.map((bar) => (
              <View key={bar.dateKey} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  {bar.height > 0 ? (
                    <View
                      style={[
                        styles.barFill,
                        bar.isToday ? styles.barFillToday : null,
                        { height: bar.height },
                      ]}
                    />
                  ) : null}
                </View>
                <Text style={[styles.barLabel, bar.isToday ? styles.barLabelToday : null]}>
                  {bar.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <FontAwesome6 color={sipupColors.teal} iconStyle="solid" name="heart-pulse" size={24} />
            <Text style={styles.metricLabel}>FLUID BALANCE</Text>
            <Text style={styles.metricValue}>{fluidBalanceLabel}</Text>
          </View>

          <View style={styles.metricCard}>
            <MaterialIcons color={sipupColors.primary} name="timeline" size={24} />
            <Text style={styles.metricLabel}>HYDRATION STREAK</Text>
            <Text style={styles.metricValue}>{streak} Days</Text>
          </View>
        </View>
      </ScrollView>

      <GoalEditor
        goal={goal}
        onClose={() => setGoalEditorVisible(false)}
        onSave={handleSaveGoal}
        visible={goalEditorVisible}
      />

      <Snackbar
        duration={1800}
        onDismiss={() => setSnackbarVisible(false)}
        style={styles.snackbar}
        visible={snackbarVisible}>
        <Text style={styles.snackbarText}>{snackbarText}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: sipupColors.background,
  },
  content: {
    paddingHorizontal: 30,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2.6,
    color: '#8a8f9f',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    color: sipupColors.text,
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#d3d7df',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    ...sipupShadow,
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  ringSection: {
    alignItems: 'center',
    marginBottom: 56,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intakeValue: {
    fontSize: 72,
    lineHeight: 78,
    fontWeight: '900',
    letterSpacing: -3,
    color: sipupColors.text,
  },
  intakeLabel: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 4.2,
    color: '#2c3446',
  },
  targetChip: {
    marginTop: 24,
    backgroundColor: '#f2eef0',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 999,
  },
  targetChipText: {
    color: sipupColors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionEyebrow: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#9a9fad',
  },
  quickLogGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  nextReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 34,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 115, 140, 0.08)',
    alignSelf: 'center',
  },
  nextReminderText: {
    fontSize: 14,
    fontWeight: '700',
    color: sipupColors.teal,
    letterSpacing: 0.3,
  },
  quickLogButton: {
    flex: 1,
    minHeight: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: '#c9dffb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  quickLogText: {
    fontSize: 17,
    fontWeight: '800',
    color: sipupColors.text,
  },
  insightCard: {
    borderRadius: 36,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 26,
    paddingTop: 36,
    paddingBottom: 30,
    marginBottom: 24,
  },
  insightIntro: {
    marginBottom: 28,
  },
  insightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  insightTagText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: sipupColors.teal,
  },
  insightTitle: {
    fontSize: 18,
    lineHeight: 28,
    color: sipupColors.text,
    fontWeight: '500',
  },
  insightHighlight: {
    color: sipupColors.primary,
    fontWeight: '900',
  },
  insightCopy: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 28,
    color: '#7c8191',
  },
  barChart: {
    height: 170,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 28,
  },
  barTrack: {
    width: 12,
    height: 128,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 8,
    borderRadius: 999,
    backgroundColor: '#d8dae4',
  },
  barFillToday: {
    width: 12,
    backgroundColor: sipupColors.primary,
    ...sipupShadow,
  },
  barLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#999eab',
  },
  barLabelToday: {
    color: sipupColors.primary,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  metricCard: {
    flex: 1,
    minHeight: 138,
    borderRadius: 34,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  metricLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#8f939f',
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: sipupColors.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,19,23,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    ...sipupShadow,
  },
  modalTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: sipupColors.text,
  },
  modalCopy: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 23,
    color: sipupColors.textSoft,
  },
  modalInput: {
    marginTop: 20,
    marginBottom: 20,
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: sipupColors.surfaceSoft,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: sipupColors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalGhostButton: {
    height: 48,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGhostText: {
    fontSize: 16,
    fontWeight: '700',
    color: sipupColors.textSoft,
  },
  modalPrimaryButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: sipupColors.primary,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  snackbar: {
    marginHorizontal: 18,
    marginBottom: 112,
    backgroundColor: '#16345e',
  },
  snackbarText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
