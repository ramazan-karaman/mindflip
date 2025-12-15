import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

// Bileşenler ve Repolar
import DailyRing from '../../components/stats/DailyRing';
import RadarChart from '../../components/stats/RadarChart';
import * as PracticeRepository from '../../lib/repositories/practiceRepository';
import * as StatisticRepository from '../../lib/repositories/statisticRepository';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // --- 1. VERİ ÇEKME (Yeni Repository Fonksiyonları) ---
  
  // A. Pratik Geçmişi (Radar Grafiği için)
  const { data: practices } = useQuery({ 
    queryKey: ['practices'], 
    queryFn: PracticeRepository.getAllPractices 
  });

  // B. Günlük İlerleme (Halka için - Deste Bazlı)
  const { data: dailyProgress } = useQuery({ 
    queryKey: ['dailyProgress'], 
    queryFn: StatisticRepository.getDailyProgress 
  });

  // C. Seri (Streak)
  const { data: streak } = useQuery({ 
    queryKey: ['streak'], 
    queryFn: StatisticRepository.getStreak 
  });

  // D. Gelecek Planı & Zayıf Kartlar
  const { data: mastery } = useQuery({ queryKey: ['mastery'], queryFn: StatisticRepository.getMasteryDistribution });
  const { data: weakCards } = useQuery({ queryKey: ['weakCards'], queryFn: StatisticRepository.getWeakestCards });

  const isLoading = !practices || !dailyProgress || !mastery;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries(); // Tüm verileri yenile
    setRefreshing(false);
  }, [queryClient]);

  // --- 2. HESAPLAMA MOTORU ---
  const stats = useMemo(() => {
    if (!practices || !mastery) return null;

    // RADAR GRAFİĞİ (5 Boyut - Yeni Mod İsimleri)
    // types.ts'deki PracticeMode tipleriyle eşleşmeli:
    // 'classic', 'match', 'writing', 'true_false', 'multiple_choice'
    const modeCounts = { classic: 0, match: 0, truefalse: 0, write: 0, multiple: 0 };
    
    practices.forEach(p => {
        // Veritabanındaki mode string'i ile eşleştirme
        const mode = p.mode || 'classic';
        if (modeCounts[mode as keyof typeof modeCounts] !== undefined) {
            modeCounts[mode as keyof typeof modeCounts] += 1;
        }
    });

    // En yüksek modu %100 kabul et (Normalize)
    const maxVal = Math.max(...Object.values(modeCounts), 1);
    
    const radarData = [
        { label: 'Hafıza', value: Math.max((modeCounts.classic / maxVal) * 100, 20) },
        { label: 'Refleks', value: Math.max((modeCounts.match / maxVal) * 100, 20) },
        { label: 'Karar', value: Math.max((modeCounts.truefalse / maxVal) * 100, 20) },
        { label: 'Yazım', value: Math.max((modeCounts.write / maxVal) * 100, 20) },
        { label: 'Analiz', value: Math.max((modeCounts.multiple / maxVal) * 100, 20) },
    ];

    const totalCards = mastery.new + mastery.learning + mastery.reviewing + mastery.mastered;
    
    // UI/UX: Renk paletini modernize ettik
    const masteryData = [
        { value: mastery.mastered, color: '#4CAF50', text: 'Usta', focused: true },    // Canlı Yeşil
        { value: mastery.reviewing, color: '#42A5F5', text: 'İyi' },     // Soft Mavi
        { value: mastery.learning, color: '#FFA726', text: 'Çalışılıyor' }, // Turuncu
        { value: mastery.new, color: '#CFD8DC', text: 'Yeni' },          // Açık Gri (Göz yormayan)
    ];

    return { radarData, masteryData, totalCards };
  }, [practices, mastery]);

  const renderCenterLabel = () => {
    return (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 28, color: '#333', fontWeight: 'bold' }}>
                {stats?.totalCards || 0}
            </Text>
            <Text style={{ fontSize: 12, color: '#999', fontWeight: '600' }}>
                Toplam
            </Text>
        </View>
    );
  }


  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <View>
            <Text style={styles.greeting}>İyi Günler 👋</Text>
            <Text style={styles.subGreeting}>İstikrar başarıyı getirir.</Text>
        </View>
        <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.streakText}>{streak || 0}</Text> 
        </View>
      </View>

      {/* 2. GÜNLÜK HEDEF HALKASI (DESTE BAZLI) */}
      <View style={styles.heroSection}>
         {/* DailyRing artık doğrudan sayıları alıyor */}
         <DailyRing 
            completedDecks={dailyProgress?.completedDecks || 0}
            totalDecks={dailyProgress?.totalDecks || 0}
         />
         
         {/* Alt Bilgi */}
         <View style={styles.heroStatsRow}>
             <Text style={styles.heroStatText}>
                 Bugün Toplam {dailyProgress?.totalCardsStudied} Kart Çalışıldı
             </Text>
         </View>
      </View>

      {/* 3. GELİŞİM FIRSATI (KIRMIZI BÖLGE) */}
      {weakCards && weakCards.length > 0 ? (
          <View style={styles.actionCard}>
              <View style={styles.actionHeader}>
                  <View style={styles.iconBox}>
                    <Ionicons name="fitness" size={24} color="#FF9800" />
                  </View>
                  <View style={{flex: 1}}>
                      <Text style={styles.actionTitle}>Gelişim Fırsatı</Text>
                      <Text style={styles.actionDesc}>
                          Toplam <Text style={{fontWeight: 'bold'}}>{weakCards.length} kart</Text> pekiştirme bekliyor.
                      </Text>
                  </View>
              </View>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert("Bilgi", "Bu kartlar 'Gelişim' destesi olarak hazırlanıyor.")}
              >
                  <Text style={styles.actionButtonText}>Oturumu Başlat</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
          </View>
      ) : (
          <View style={[styles.actionCard, { backgroundColor: '#E8F5E9' }]}>
              <View style={styles.actionHeader}>
                  <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                  <View style={{marginLeft: 10, flex: 1}}>
                      <Text style={[styles.actionTitle, {color: '#2E7D32'}]}>Harika Gidiyorsun!</Text>
                      <Text style={[styles.actionDesc, {color: '#388E3C'}]}>Zorlandığın kart yok.</Text>
                  </View>
              </View>
          </View>
      )}

      {/* 4. BECERİ ANALİZİ (RADAR) */}
      <View style={styles.chartCard}>
          <View style={styles.cardTitleRow}>
             <Ionicons name="analytics" size={20} color="#666" />
             <Text style={styles.sectionTitle}>Beceri Analizi</Text>
          </View>
          
          <View style={{marginTop: 15, alignItems: 'center'}}>
             <RadarChart data={stats?.radarData || []} size={240} />
          </View>
          <View style={styles.legendContainer}>
              <Text style={styles.legendText}>• Dengeli gelişim için farklı modları dene.</Text>
          </View>
      </View>

      {/* 5. GELECEK PLANI (BAR) */}
     <View style={styles.chartCard}>
            <View style={styles.cardTitleRow}>
               <Ionicons name="school" size={20} color="#666" />
               <Text style={styles.sectionTitle}>Bilgi Deposu Durumu</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Kartlarının öğrenilme seviyeleri</Text>
            
            <View style={{ marginTop: 20, alignItems: 'center' }}>
                {/* MODERN PASTA GRAFİK */}
                <PieChart
                    data={stats?.masteryData || []}
                    donut
                    radius={90}
                    innerRadius={65} // Daha ince ve şık bir halka
                    centerLabelComponent={renderCenterLabel} // Ortada toplam sayı
                    showText={false} // Dilimlerin üstüne yazı yazma, modern durmaz
                    //roundedCorners // Dilim kenarlarını yumuşat
                    strokeWidth={2}
                    strokeColor="#fff" // Dilimler arası beyaz boşluk
                />
            </View>

            {/* MODERN GRID LEGEND */}
            <View style={styles.gridLegendContainer}>
                {/* Usta */}
                <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#4CAF50'}]} />
                    <View>
                        <Text style={styles.legendValue}>{mastery?.mastered || 0}</Text>
                        <Text style={styles.legendLabel}>Usta</Text>
                    </View>
                </View>
                {/* İyi */}
                <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#42A5F5'}]} />
                    <View>
                        <Text style={styles.legendValue}>{mastery?.reviewing || 0}</Text>
                        <Text style={styles.legendLabel}>İyi</Text>
                    </View>
                </View>
                {/* Çalışılıyor */}
                <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#FFA726'}]} />
                    <View>
                        <Text style={styles.legendValue}>{mastery?.learning || 0}</Text>
                        <Text style={styles.legendLabel}>Çalışılıyor</Text>
                    </View>
                </View>
                {/* Yeni */}
                <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#CFD8DC'}]} />
                    <View>
                        <Text style={styles.legendValue}>{mastery?.new || 0}</Text>
                        <Text style={styles.legendLabel}>Yeni</Text>
                    </View>
                </View>
            </View>
            
            <View style={[styles.legendContainer, {marginTop: 15}]}>
                <Text style={styles.legendText}>• Yeşil alan arttıkça hafızan güçleniyor demektir.</Text>
            </View>
        </View>

    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingBottom: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subGreeting: { fontSize: 14, color: '#888', marginTop: 4 },
  streakContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontSize: 18, fontWeight: 'bold', color: '#FF5722', marginLeft: 6 },

  heroSection: { alignItems: 'center', marginVertical: 10 },
  heroStatsRow: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#E3F2FD', borderRadius: 20 },
  heroStatText: { color: '#1976D2', fontWeight: '600', fontSize: 14 },

  // Action Card
  actionCard: { marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width: 0, height: 4}, marginBottom: 25, marginTop: 10 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  actionDesc: { fontSize: 14, color: '#666', marginTop: 4, lineHeight: 20 },
  actionButton: { backgroundColor: '#FF9800', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginRight: 8 },

  // Chart Cards
  chartCard: { marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionSubtitle: { fontSize: 12, color: '#999', marginTop: 5, marginLeft: 28 },
  legendContainer: { marginTop: 15, alignItems: 'center' },
  legendText: { fontSize: 12, color: '#999', fontStyle: 'italic' },


  gridLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingHorizontal: 10,
  },
  legendItem: {
    width: '45%', // 2 sütunlu yapı
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 12,
  },

  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  legendLabel: { fontSize: 12, color: '#666' },
});