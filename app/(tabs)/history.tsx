import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWaterStore } from '@/store/useWaterStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { format, parseISO } from 'date-fns';

export default function AnalyticsScreen() {
  const [chartView, setChartView] = useState<'today' | 'weekly' | 'monthly'>('weekly');
  const [chartMode, setChartMode] = useState<'bar' | 'line'>('bar');

  const history = useHistoryStore((state) => state.history);
  const streak = useHistoryStore((state) => state.streak);
  const todayIntake = useWaterStore((state) => state.intake);
  const drinkLogs = useWaterStore((state) => state.drinkLogs);
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

  const allRecords = [...history].reverse().concat({ 
    date: 'Today', 
    intake: todayIntake, 
    goal, 
    drinkLogs 
  });

  const activeDays = allRecords.length;
  const metGoalDays = allRecords.filter(r => r.intake >= r.goal).length;
  const consistencyScore = activeDays > 0 ? Math.round((metGoalDays / activeDays) * 100) : 0;

  let morning = 0;
  let afternoon = 0;
  let evening = 0;

  allRecords.forEach(record => {
    if (record.drinkLogs) {
      record.drinkLogs.forEach(log => {
        const h = new Date(log.timestamp).getHours();
        if (h >= 5 && h < 12) morning += log.amount;
        else if (h >= 12 && h < 17) afternoon += log.amount;
        else evening += log.amount;
      });
    }
  });

  let bestTime = "N/A";
  const maxTime = Math.max(morning, afternoon, evening);
  if (maxTime > 0) {
    if (maxTime === morning) bestTime = "Morning 🌅";
    else if (maxTime === afternoon) bestTime = "Afternoon ☀️";
    else bestTime = "Evening 🌙";
  }

  const chartData = chartView === 'weekly' ? allRecords.slice(-7) : allRecords.slice(-30);
  const heatmapData = allRecords.slice(-28);
  
  // Pad heatmap to 28 days if shorter for a clean 4x7 grid
  while (heatmapData.length < 28) {
    heatmapData.unshift({ date: 'N/A', intake: 0, goal: 3000 });
  }

  const todayBlocks = [
    { label: '6AM', min: 4, max: 9, amount: 0 },
    { label: '10AM', min: 9, max: 13, amount: 0 },
    { label: '2PM', min: 13, max: 17, amount: 0 },
    { label: '6PM', min: 17, max: 21, amount: 0 },
    { label: '10PM', min: 21, max: 25, amount: 0 },
  ];
  if (drinkLogs) {
    drinkLogs.forEach(log => {
      const h = new Date(log.timestamp).getHours();
      for (const b of todayBlocks) {
        if (h >= b.min && h < b.max) {
          b.amount += log.amount;
          break;
        }
      }
    });
  }

  // --- PLOT DATA NORMALIZATION ---
  let plotData: { label: string, pct: number, color: string, value: number }[] = [];
  
  if (chartView === 'today') {
    plotData = todayBlocks.map(b => {
      const maxVal = Math.max(goal / 2, 1000);
      return { 
        label: b.label, 
        pct: Math.min((b.amount / maxVal) * 100, 100), 
        color: primaryColor, 
        value: b.amount 
      };
    });
  } else if (chartView === 'weekly') {
    const weekRecords = allRecords.slice(-7);
    plotData = weekRecords.map(d => {
      let label = 'N/A';
      if (d.date !== 'Today' && d.date !== 'N/A') {
        try { label = format(parseISO(d.date), 'EEE'); } catch(e){}
      } else if (d.date === 'Today') {
        label = format(new Date(), 'EEE'); // Show actual day e.g., 'Sun', 'Mon'
      }
      const maxVal = Math.max(goal, 3000);
      return { 
        label, 
        pct: Math.min((d.intake / maxVal) * 100, 100), 
        color: d.intake >= d.goal ? successColor : primaryColor, 
        value: d.intake 
      };
    });
  } else if (chartView === 'monthly') {
    // Take the last 28 days and group into 4 weeks of 7 days
    const last28 = allRecords.slice(-28);
    const weeks = [];
    for(let i=0; i<last28.length; i+=7) {
      weeks.push(last28.slice(i, i+7));
    }
    plotData = weeks.map((chunk, idx) => {
      const sum = chunk.reduce((s, r) => s + r.intake, 0);
      const sumGoal = chunk.reduce((s, r) => s + r.goal, 0) || (goal * 7);
      const maxVal = Math.max(sumGoal, 3000 * 7);
      return { 
        label: `W${idx+1}`, 
        pct: Math.min((sum / maxVal) * 100, 100), 
        color: sum >= sumGoal ? successColor : primaryColor, 
        value: sum 
      };
    });
  }

  const avgIntake = Math.round(
    (history.reduce((acc, r) => acc + r.intake, 0) + todayIntake) / (history.length + 1)
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
      <Text style={[styles.title, { color: textColor }]}>Analytics</Text>

      {/* Deep Analytics Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statValue, { color: successColor }]}>🔥 {streak}</Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statValue, { color: primaryColor }]}>{consistencyScore}%</Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>Consistency</Text>
        </View>
      </View>
      <View style={[styles.statsGrid, { marginTop: -16 }]}>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statValue, { color: primaryColor }]}>{avgIntake}</Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>Avg Intake (ml)</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statValue, { color: primaryColor, fontSize: 18, marginTop: 4, marginBottom: 8 }]}>{bestTime}</Text>
          <Text style={[styles.statLabel, { color: mutedTextColor }]}>Best Time</Text>
        </View>
      </View>

      {/* Activity Heatmap */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>Activity Heatmap</Text>
      <View style={[styles.chartCard, { backgroundColor: cardBg, padding: 20 }]}>
        <View style={styles.heatmapGrid}>
          {heatmapData.map((d, i) => {
            let color = isDark ? '#374151' : '#E5E7EB';
            if (d.intake > 0) {
              const pct = d.intake / d.goal;
              if (pct >= 1) color = successColor;
              else if (pct >= 0.5) color = primaryColor;
              else color = isDark ? '#1E3A8A' : '#BFDBFE';
            }
            return <View key={i} style={[styles.heatBox, { backgroundColor: color }]} />;
          })}
        </View>
      </View>

      {/* Main Chart */}
      <View style={styles.chartHeader}>
        <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 0 }]}>Trends</Text>
        <View style={[styles.toggleRow, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
          <TouchableOpacity onPress={() => setChartView('today')} style={[styles.toggleBtn, chartView === 'today' && {backgroundColor: primaryColor}]}>
            <Text style={[styles.toggleText, {color: chartView==='today'?'#fff':mutedTextColor}]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setChartView('weekly')} style={[styles.toggleBtn, chartView === 'weekly' && {backgroundColor: primaryColor}]}>
            <Text style={[styles.toggleText, {color: chartView==='weekly'?'#fff':mutedTextColor}]}>7D</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setChartView('monthly')} style={[styles.toggleBtn, chartView === 'monthly' && {backgroundColor: primaryColor}]}>
            <Text style={[styles.toggleText, {color: chartView==='monthly'?'#fff':mutedTextColor}]}>30D</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
          <View style={[styles.toggleRow, { backgroundColor: isDark ? '#374151' : '#E5E7EB', padding: 2 }]}>
            <TouchableOpacity onPress={() => setChartMode('bar')} style={[styles.toggleBtn, chartMode === 'bar' && {backgroundColor: isDark ? '#4B5563' : '#FFFFFF', paddingVertical: 4, paddingHorizontal: 12}]}>
              <Text style={[styles.toggleText, {color: chartMode==='bar'?textColor:mutedTextColor}]}>Bars</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChartMode('line')} style={[styles.toggleBtn, chartMode === 'line' && {backgroundColor: isDark ? '#4B5563' : '#FFFFFF', paddingVertical: 4, paddingHorizontal: 12}]}>
              <Text style={[styles.toggleText, {color: chartMode==='line'?textColor:mutedTextColor}]}>Graph</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartContainer}>
          {chartMode === 'bar' ? (
            plotData.map((d, i) => (
              <View key={i} style={styles.barWrapper}>
                <View style={[styles.barBg, { backgroundColor: isDark ? '#374151' : '#E5E7EB', width: chartView === 'monthly' ? 24 : 16 }]}>
                  <View style={[styles.barFill, { height: `${d.pct}%`, backgroundColor: d.color }]} />
                </View>
                <Text style={[styles.barLabel, { color: mutedTextColor, fontSize: 10, marginTop: 4 }]}>{d.label}</Text>
              </View>
            ))
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16 }}>
              {plotData.map((d, i) => (
                <View key={i} style={{ alignItems: 'center', flex: 1, height: 120, justifyContent: 'flex-end' }}>
                  <View style={{
                    width: 10, height: 10, borderRadius: 5, backgroundColor: d.color,
                    position: 'absolute', bottom: `${d.pct}%`, zIndex: 2,
                    shadowColor: d.color, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }
                  }} />
                  <View style={{
                    width: 2, height: `${d.pct}%`, backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
                    zIndex: 1,
                  }} />
                  <Text style={[styles.barLabel, { position: 'absolute', bottom: -20, color: mutedTextColor, fontSize: 10 }]}>{d.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Logs</Text>

      {history.length === 0 && todayIntake === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: mutedTextColor, textAlign: 'center', fontSize: 16 }}>No history yet. Start drinking water!</Text>
        </View>
      ) : (
        allRecords.slice(-7).reverse().map((record, index) => {
          const isGoalMet = record.intake >= record.goal;
          const progress = record.goal > 0 ? Math.min(record.intake / record.goal, 1) : 0;
          const percentage = Math.round(progress * 100);

          let displayDate = record.date;
          if (displayDate !== 'Today') {
            try {
              displayDate = format(parseISO(record.date), 'MMM d, yyyy');
            } catch (e) {}
          }

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
    padding: 16,
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  heatBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
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
