import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Switch } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWaterStore } from '@/store/useWaterStore';
import { useWorkoutStore, WorkoutSchedule } from '@/store/useWorkoutStore';
import { scheduleWorkoutReminders } from '@/utils/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HomeScreen() {
  const intake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
  const wakeUpTime = useWaterStore((state) => state.wakeUpTime);
  const addWater = useWaterStore((state) => state.addWater);
  const resetWater = useWaterStore((state) => state.resetWater);
  const updateGoal = useWaterStore((state) => state.updateGoal);
  const checkNewDay = useWaterStore((state) => state.checkNewDay);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isGoalModalVisible, setGoalModalVisible] = useState(false);
  const [newGoalText, setNewGoalText] = useState(goal.toString());

  const [isCustomModalVisible, setCustomModalVisible] = useState(false);
  const [customAmountText, setCustomAmountText] = useState('');

  const [habitMenuVisible, setHabitMenuVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const workoutSchedule = useWorkoutStore((state) => state.schedule);
  const updateWorkoutSchedule = useWorkoutStore((state) => state.updateSchedule);
  const [tempWorkoutSchedule, setTempWorkoutSchedule] = useState<WorkoutSchedule>(workoutSchedule);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const handlePressAdd = (amount: number) => {
    addWater(amount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(`Added ${amount} ml of water!`);
  };

  const handleLongPressAdd = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    intervalRef.current = setInterval(() => {
      addWater(amount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }, 150);
  };

  const handlePressOutAdd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    checkNewDay();
  }, []);

  const progress = Math.min(intake / goal, 1);
  const percentage = Math.round(progress * 100);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${percentage}%`, {
        damping: 15,
        stiffness: 90,
      }),
    };
  });

  const getStatusMessage = () => {
    if (intake >= goal) {
      return { msg1: "Goal reached! 🎉", msg2: "Great job hydrating today!" };
    }

    const now = new Date();
    // Dynamically calculate from exact wake up moment
    const start = wakeUpTime ? new Date(wakeUpTime) : new Date(now);
    if (!wakeUpTime) start.setHours(9, 0, 0, 0); 
    
    const end = new Date(now);
    end.setHours(22, 0, 0, 0); // 10 PM

    if (now.getTime() < start.getTime()) {
      return { msg1: "Good morning! ☀️", msg2: "Let's get started on your hydration." };
    }

    const totalMinutes = (end.getTime() - start.getTime()) / 60000;
    const passedMinutes = Math.min((now.getTime() - start.getTime()) / 60000, totalMinutes);
    
    const expectedIntake = (goal / totalMinutes) * passedMinutes;
    const diff = expectedIntake - intake;

    if (diff > 0) {
      const roundedDiff = Math.abs(Math.round(diff / 10) * 10);
      const glasses = Math.ceil(diff / 250);
      return { 
        msg1: `You are behind by ${roundedDiff}ml today`, 
        msg2: `Drink ${glasses} glass${glasses > 1 ? 'es' : ''} to stay on track` 
      };
    } else {
      return { msg1: "You are on track! 💧", msg2: "Keep up the good pacing." };
    }
  };

  const { msg1, msg2 } = getStatusMessage();

  const handleSaveWorkout = () => {
    updateWorkoutSchedule(tempWorkoutSchedule);
    scheduleWorkoutReminders();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Workout schedule natively saved! Weekly reminders active.");
    setWorkoutModalVisible(false);
  };

  const handleSaveGoal = () => {
    if (!newGoalText.trim()) {
      showToast('Please enter a goal amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const val = parseInt(newGoalText, 10);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid goal');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    updateGoal(val);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Daily goal updated to ${val} ml!`);
    setGoalModalVisible(false);
  };

  const handleSaveCustomAmount = () => {
    if (!customAmountText.trim()) {
      showToast('Please enter an amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const val = parseInt(customAmountText, 10);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    addWater(val);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Added ${val} ml of water!`);
    setCustomModalVisible(false);
    setCustomAmountText('');
  };

  const primaryColor = isDark ? '#60A5FA' : '#3B82F6';
  const bgColor = isDark ? '#111827' : '#F3F4F6';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const mutedTextColor = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setHabitMenuVisible(true)} style={{flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8}}>
            <Text style={[styles.title, { color: textColor, marginBottom: 0 }]}>SipUp 💧</Text>
            <IconSymbol name="chevron.right" size={24} color={primaryColor} style={{transform: [{rotate: '90deg'}], marginLeft: 4}} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              resetWater();
            }} 
            style={styles.resetButton} 
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <IconSymbol name="arrow.clockwise" size={24} color={mutedTextColor} />
          </TouchableOpacity>
        </View>

        {/* Progress Card */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: mutedTextColor }]}>Today's Intake</Text>
          
          <View style={styles.intakeContainer}>
            <Text style={[styles.intakeText, { color: textColor }]}>{intake}</Text>
            <Text style={[styles.goalText, { color: mutedTextColor }]}> / {goal} ml</Text>
          </View>

          <TouchableOpacity onPress={() => { setNewGoalText(goal.toString()); setGoalModalVisible(true); }}>
            <Text style={[styles.editGoalText, { color: primaryColor }]}>Edit Goal</Text>
          </TouchableOpacity>

          <View style={styles.progressWrapper}>
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <Animated.View style={[styles.progressBarFill, { backgroundColor: primaryColor }, animatedFillStyle]} />
            </View>
            <Text style={[styles.percentageText, { color: mutedTextColor }]}>{percentage}%</Text>
          </View>
        </View>

        {/* Insights Card */}
        <View style={[styles.statusCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF' }]}>
          <Text style={[styles.statusMsg1, { color: primaryColor }]}>{msg1}</Text>
          <Text style={[styles.statusMsg2, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>{msg2}</Text>
        </View>

        {/* Quick Add Buttons */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Add</Text>
        <View style={styles.buttonsGrid}>
          <Button 
            mode="contained"
            buttonColor={cardBg}
            textColor={textColor}
            style={styles.addButton}
            onPress={() => handlePressAdd(250)}
            onLongPress={() => handleLongPressAdd(250)}
            onPressOut={handlePressOutAdd}
          >
            +250 ml
          </Button>
          <Button 
            mode="contained"
            buttonColor={cardBg}
            textColor={textColor}
            style={styles.addButton}
            onPress={() => handlePressAdd(500)}
            onLongPress={() => handleLongPressAdd(500)}
            onPressOut={handlePressOutAdd}
          >
            +500 ml
          </Button>
          <Button 
            mode="contained"
            buttonColor={cardBg}
            textColor={textColor}
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCustomModalVisible(true);
            }}
          >
            Custom
          </Button>
        </View>

      </ScrollView>

      {/* Custom Amount Modal */}
      {isCustomModalVisible && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>Custom Amount (ml)</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                    keyboardType="number-pad"
                    value={customAmountText}
                    onChangeText={setCustomAmountText}
                    maxLength={5}
                    autoFocus
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => { setCustomModalVisible(false); setCustomAmountText(''); }} style={styles.modalButton}>
                      <Text style={[styles.modalButtonText, { color: mutedTextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveCustomAmount} style={[styles.modalButton, { backgroundColor: primaryColor, borderRadius: 8 }]}>
                      <Text style={[styles.modalButtonText, { color: '#FFF', fontWeight: 'bold' }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Habit Dropdown Modal */}
      <Modal visible={habitMenuVisible} transparent animationType="fade" onRequestClose={() => setHabitMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHabitMenuVisible(false)}>
          <View style={[styles.menuContainer, { backgroundColor: cardBg }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setHabitMenuVisible(false)}>
              <Text style={[styles.menuText, { color: primaryColor, fontWeight: '700' }]}>💧 SipUp (Water)</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setHabitMenuVisible(false); setTempWorkoutSchedule(workoutSchedule); setWorkoutModalVisible(true); }}>
              <Text style={[styles.menuText, { color: textColor }]}>🏋️ Workout Engine</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { showToast('Sleep tracking coming soon!'); setHabitMenuVisible(false); }}>
              <Text style={[styles.menuText, { color: textColor }]}>😴 Sleep</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { showToast('Meditation coming soon!'); setHabitMenuVisible(false); }}>
              <Text style={[styles.menuText, { color: textColor }]}>🧘 Meditation</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Workout Schedule Modal */}
      <Modal visible={workoutModalVisible} animationType="slide" onRequestClose={() => setWorkoutModalVisible(false)}>
        <View style={[{flex: 1, paddingTop: insets.top, backgroundColor: bgColor}]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center'}}>
            <Text style={{fontSize: 24, fontWeight: '800', color: textColor}}>Weekly Workout 🔥</Text>
            <TouchableOpacity onPress={() => setWorkoutModalVisible(false)}><Text style={{color: mutedTextColor, fontWeight: '600'}}>Close</Text></TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={{padding: 20}}>
            <Text style={{color: mutedTextColor, marginBottom: 24}}>Set your lifelong workout timetable here. We will natively push notifications exactly 15 minutes before your scheduled start time.</Text>

            {([
              { id: 2, label: 'Mon' }, { id: 3, label: 'Tue' }, { id: 4, label: 'Wed' },
              { id: 5, label: 'Thu' }, { id: 6, label: 'Fri' }, { id: 7, label: 'Sat' }, { id: 1, label: 'Sun' }
            ] as const).map(day => {
              const current = tempWorkoutSchedule?.[day.id as keyof WorkoutSchedule] || { hour: 17, minute: 0, isRest: false };
              return (
                <View key={day.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: cardBg, padding: 16, borderRadius: 16}}>
                  <Text style={{color: textColor, width: 50, fontWeight: '700', fontSize: 16}}>{day.label}</Text>
                  
                  {!current.isRest ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <TextInput 
                        style={[styles.timeInput, {backgroundColor: isDark ? '#374151' : '#F3F4F6', color: textColor}]} 
                        value={current.hour.toString().padStart(2, '0')} 
                        keyboardType="number-pad" maxLength={2} 
                        onChangeText={(t) => setTempWorkoutSchedule(prev => ({...prev, [day.id]: {...current, hour: parseInt(t||'0')%24}}))}
                      />
                      <Text style={{color: mutedTextColor, marginHorizontal: 8, fontSize: 20, fontWeight: '800'}}>:</Text>
                      <TextInput 
                        style={[styles.timeInput, {backgroundColor: isDark ? '#374151' : '#F3F4F6', color: textColor}]} 
                        value={current.minute.toString().padStart(2, '0')} 
                        keyboardType="number-pad" maxLength={2} 
                        onChangeText={(t) => setTempWorkoutSchedule(prev => ({...prev, [day.id]: {...current, minute: parseInt(t||'0')%60}}))}
                      />
                    </View>
                  ) : (
                    <Text style={{color: mutedTextColor, fontStyle: 'italic', flex: 1, textAlign: 'center'}}>Rest Day 🛋️</Text>
                  )}

                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <Text style={{color: current.isRest ? primaryColor : mutedTextColor, fontSize: 12, fontWeight: '700'}}>Rest</Text>
                    <Switch 
                      value={current.isRest} 
                      onValueChange={v => setTempWorkoutSchedule(prev => ({...prev, [day.id]: {...current, isRest: v}}))} 
                      trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: primaryColor }}
                    />
                  </View>
                </View>
              )
            })}
          </ScrollView>

          <View style={{padding: 20, paddingBottom: insets.bottom + 20, backgroundColor: cardBg, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB'}}>
            <Button mode="contained" buttonColor={primaryColor} textColor="#FFF" style={{borderRadius: 12, paddingVertical: 6}} onPress={handleSaveWorkout}>
              Save Lifecycle Schedule
            </Button>
          </View>
        </View>
      </Modal>

      {/* Goal Modal */}
      {isGoalModalVisible && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>Set Daily Goal (ml)</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                    keyboardType="number-pad"
                    value={newGoalText}
                    onChangeText={setNewGoalText}
                    maxLength={5}
                    autoFocus
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setGoalModalVisible(false)} style={styles.modalButton}>
                      <Text style={[styles.modalButtonText, { color: mutedTextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveGoal} style={[styles.modalButton, { backgroundColor: primaryColor, borderRadius: 8 }]}>
                      <Text style={[styles.modalButtonText, { color: '#FFF', fontWeight: 'bold' }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={3000}
        style={{ backgroundColor: primaryColor }}
        action={{
          label: 'OK',
          textColor: '#FFF',
          onPress: () => setToastVisible(false),
        }}
      >
        <Text style={{ color: '#FFF' }}>{toastMessage}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  resetButton: {
    padding: 8,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusMsg1: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusMsg2: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuContainer: {
    width: 250,
    borderRadius: 16,
    padding: 8,
    alignSelf: 'center',
    marginTop: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    width: '100%',
  },
  timeInput: {
    width: 48,
    height: 48,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  intakeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  intakeText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  goalText: {
    fontSize: 20,
    fontWeight: '600',
  },
  editGoalText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  buttonsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonLabel: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalButtonText: {
    fontSize: 16,
  },
});
