import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import * as PracticeRepository from '../../lib/repositories/practiceRepository';
import * as StatisticRepository from '../../lib/repositories/statisticRepository';

export default function StatsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // İstatistikleri Getir (User ID yok)
  const {
    data: stats,
    isLoading: isLoadingStats,
    isError: isErrorStats,
  } = useQuery({
    queryKey: ['statistics'],
    queryFn: StatisticRepository.getStatistics,
  });

  // Pratik Geçmişini Getir (User ID yok)
  const {
    data: practices,
    isLoading: isLoadingPractices,
    isError: isErrorPractices,
  } = useQuery({
    queryKey: ['practices'],
    queryFn: PracticeRepository.getAllPractices,
  });

  // Pull-to-Refresh (Aşağı çekerek yenileme) mantığı
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['statistics'] }),
      queryClient.invalidateQueries({ queryKey: ['practices'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Hesaplamalar
  const totalStudied =
    stats?.reduce((sum, stat) => sum + (stat.studied_card_count || 0), 0) ?? 0;
  const totalAdded =
    stats?.reduce((sum, stat) => sum + (stat.added_card_count || 0), 0) ?? 0;
  
  // Süre hesaplama (ms cinsinden olduğu varsayılıyor)
  const totalTimeSpentMs =
    practices?.reduce((sum, p) => sum + (p.duration || 0), 0) ?? 0;
  const totalTimeMinutes = Math.floor(totalTimeSpentMs / 1000 / 60);

  // Ortalama Başarı Oranı
  const totalPracticeCount = practices?.length ?? 0;
  const averageSuccessRate = totalPracticeCount > 0 
    ? Math.round(practices!.reduce((sum, p) => sum + (p.success_rate || 0), 0) / totalPracticeCount)
    : 0;

  if (isLoadingStats || isLoadingPractices) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>İstatistikler hesaplanıyor...</Text>
      </View>
    );
  }

  if (isErrorStats || isErrorPractices) {
    return (
      <ScrollView 
        contentContainerStyle={styles.centerContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Veriler yüklenemedi</Text>
        <Text style={styles.errorText}>Tekrar denemek için ekranı aşağı çekin.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.headerTitle}>Genel Bakış</Text>

      <View style={styles.gridContainer}>
        
        {/* Çalışılan Kartlar */}
        <View style={styles.statBox}>
          <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="book-outline" size={24} color="#2196F3" />
          </View>
          <Text style={styles.statValue}>{totalStudied}</Text>
          <Text style={styles.statLabel}>Çalışılan Kart</Text>
        </View>

        {/* Eklenen Kartlar */}
        <View style={styles.statBox}>
           <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{totalAdded}</Text>
          <Text style={styles.statLabel}>Eklenen Kart</Text>
        </View>

        {/* Toplam Süre */}
        <View style={styles.statBox}>
           <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
          </View>
          <Text style={styles.statValue}>{totalTimeMinutes} dk</Text>
          <Text style={styles.statLabel}>Toplam Süre</Text>
        </View>

        {/* Başarı Oranı */}
        <View style={styles.statBox}>
           <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="trophy-outline" size={24} color="#9C27B0" />
          </View>
          <Text style={styles.statValue}>%{averageSuccessRate}</Text>
          <Text style={styles.statLabel}>Başarı Oranı</Text>
        </View>

      </View>
      
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#999" />
        <Text style={styles.infoText}>
          İstatistikler cihazınızdaki yerel veritabanından alınmaktadır.
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  statBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '47%', // İki sütunlu yapı
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    marginTop: 40,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  infoText: {
    color: '#999',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },
});