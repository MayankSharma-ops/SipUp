import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWaterStore } from '@/store/useWaterStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { format, parseISO } from 'date-fns';

export default function AnalyticsScreen() {
  const history = useHistoryStore((state) => state.history);
  const streak = useHistoryStore((state) => state.streak);
  const todayIntake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
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
      
      <Text style={[styles.title, { color: textColor }]}>Analytics</Text>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statValue, { color: primaryColor }]}>{Math.round(
            (history.reduce((acc, r) => acc + r.intake, 0) + todayIntake) / (history.length + 1)
          )} ml</Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>Avg Intake</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statValue, { color: successColor }]}>🔥 {streak}</Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>Day Streak</Text>
        </View>
      </View>

      {/* Weekly Chart */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>Overview</Text>
      <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
        <View style={styles.chartContainer}>
          {[...history].reverse().concat({ date: 'Today', intake: todayIntake, goal }).slice(-7).map((d, i) => {
            const maxVal = Math.max(goal, 3000);
            const heightPct = Math.min((d.intake / maxVal) * 100, 100);
            let dayLabel = 'T';
            if (d.date !== 'Today') {
              try { dayLabel = format(parseISO(d.date), 'EEEE').substring(0,1); } catch(e){}
            } else {
              dayLabel = 'Today';
            }
            return (
              <View key={i} style={styles.barWrapper}>
                <View style={[styles.barBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                  <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: d.intake >= d.goal ? successColor : primaryColor }]} />
                </View>
                <Text style={[styles.barLabel, { color: mutedTextColor }, d.date === 'Today' && { fontWeight: '800', color: textColor }]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Logs</Text>

      {history.length === 0 && todayIntake === 0 ? (
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
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barBg: {
    width: 12,
    height: 120,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
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
