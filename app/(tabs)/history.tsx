import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWaterStore } from '@/store/useWaterStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { format, parseISO } from 'date-fns';

export default function HistoryScreen() {
  const { history, streak } = useWaterStore();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#111827' : '#F3F4F6';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const mutedTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const primaryColor = isDark ? '#60A5FA' : '#3B82F6';
  const successColor = isDark ? '#34D399' : '#10B981';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
      
      <Text style={[styles.title, { color: textColor }]}>History</Text>

      {/* Streak Card */}
      <View style={[styles.streakCard, { backgroundColor: cardBg }]}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={[styles.streakCount, { color: textColor }]}>{streak} Days</Text>
        <Text style={[styles.streakSubtitle, { color: mutedTextColor }]}>Current Streak</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: textColor }]}>Last 7 Days</Text>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: mutedTextColor, textAlign: 'center', fontSize: 16 }}>No history yet. Start drinking water!</Text>
        </View>
      ) : (
        history.map((record, index) => {
          const isGoalMet = record.intake >= record.goal;
          const progress = Math.min(record.intake / record.goal, 1);
          const percentage = Math.round(progress * 100);

          let displayDate = record.date;
          try {
            displayDate = format(parseISO(record.date), 'MMM d, yyyy');
          } catch (e) {}

          return (
            <View key={index} style={[styles.historyCard, { backgroundColor: cardBg }]}>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyDate, { color: textColor }]}>{displayDate}</Text>
                <View style={styles.historyIntakeWrap}>
                  <Text style={[styles.historyIntake, { color: isGoalMet ? successColor : primaryColor }]}>{record.intake}</Text>
                  <Text style={[styles.historyGoal, { color: mutedTextColor }]}> / {record.goal} ml</Text>
                </View>
              </View>

              <View style={styles.progressWrapper}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                  <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: isGoalMet ? successColor : primaryColor }]} />
                </View>
                <Text style={[styles.percentageText, { color: mutedTextColor }]}>{percentage}%</Text>
              </View>
            </View>
          );
        })
      )}

    </ScrollView>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  streakCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  streakEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyIntakeWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  historyIntake: {
    fontSize: 18,
    fontWeight: '800',
  },
  historyGoal: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  }
});
