import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWaterStore } from '@/store/useWaterStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HomeScreen() {
  const intake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
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

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  useEffect(() => {
    checkNewDay();
  }, []);

  const progress = Math.min(intake / goal, 1);
  const percentage = Math.round(progress * 100);

  const handleSaveGoal = () => {
    if (!newGoalText.trim()) {
      showToast('Please enter a goal amount');
      return;
    }
    const val = parseInt(newGoalText, 10);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid goal');
      return;
    }
    updateGoal(val);
    showToast(`Daily goal updated to ${val} ml!`);
    setGoalModalVisible(false);
  };

  const handleSaveCustomAmount = () => {
    if (!customAmountText.trim()) {
      showToast('Please enter an amount');
      return;
    }
    const val = parseInt(customAmountText, 10);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid amount');
      return;
    }
    addWater(val);
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
          <Text style={[styles.title, { color: textColor }]}>SipUp 💧</Text>
          <TouchableOpacity onPress={resetWater} style={styles.resetButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
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
              <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: primaryColor }]} />
            </View>
            <Text style={[styles.percentageText, { color: mutedTextColor }]}>{percentage}%</Text>
          </View>
        </View>

        {/* Quick Add Buttons */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Add</Text>
        <View style={styles.buttonsGrid}>
          <Button 
            mode="contained"
            buttonColor={cardBg}
            textColor={textColor}
            style={styles.addButton}
            onPress={() => {
              addWater(250);
              showToast('Added 250 ml of water!');
            }}
          >
            +250 ml
          </Button>
          <Button 
            mode="contained"
            buttonColor={cardBg}
            textColor={textColor}
            style={styles.addButton}
            onPress={() => {
              addWater(500);
              showToast('Added 500 ml of water!');
            }}
          >
            +500 ml
          </Button>
          <Button 
            mode="contained"
            buttonColor={cardBg}
            textColor={textColor}
            style={styles.addButton}
            onPress={() => {
              console.log("clicked custom");
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
