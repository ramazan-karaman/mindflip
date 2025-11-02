import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Button,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useQuery } from '@tanstack/react-query';
import * as PracticeRepository from '../../lib/repositories/practiceRepository';
import * as StatisticRepository from '../../lib/repositories/statisticRepository';
import { runFullSync } from '../../lib/services/syncService';
import { useSyncStore } from '../../lib/store/syncStore';

export default function StatsScreen() {

    const {
        data: stats,
        isLoading: isLoadingStats,
        isError: isErrorStats,
    } = useQuery({
        queryKey: ['statistics', 1],
        queryFn: () => StatisticRepository.getStatistics(1),
    });

    const {
        data: practices,
        isLoading: isLoadingPractices,
        isError: isErrorPractices,
    } = useQuery({
        queryKey: ['practices', 1],
        queryFn: () => PracticeRepository.getPractices(1),
    });

    const totalStudied =
        stats?.reduce((sum, stat) => sum + stat.studied_card_count, 0) ?? 0;
    const totalAdded =
        stats?.reduce((sum, stat) => sum + stat.added_card_count, 0) ?? 0;
    const totalTimeSpentMs =
        practices?.reduce((sum, p) => sum + p.duration, 0) ?? 0;
    const totalTimeMinutes = Math.floor(totalTimeSpentMs / 1000 / 60);

    const isSyncing = useSyncStore((state) => state.isSyncing);
    const hasPendingChanges = useSyncStore((state) => state.hasPendingChanges);

    if (isLoadingStats || isLoadingPractices) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={{ marginTop: 10, color: '#999' }}>
                    İstatistikler yükleniyor...
                </Text>
            </View>
        );
    }

    if (isErrorStats || isErrorPractices) {
        return (
            <View style={styles.container}>
                <Ionicons name="alert-circle-outline" size={64} color="red" />
                <Text style={styles.title}>İstatistikler yüklenemedi.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>İstatistikler</Text>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{totalStudied}</Text>
                    <Text style={styles.statLabel}>Toplam Çalışılan Kart</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{totalAdded}</Text>
                    <Text style={styles.statLabel}>Toplam Eklenen Kart</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{totalTimeMinutes}</Text>
                    <Text style={styles.statLabel}>Toplam Harcanan Dakika</Text>
                </View>
            </View>

            <View style={styles.syncContainer}>
                <Button
                    title="Şimdi Eşitle"
                    onPress={() => runFullSync()} 
                    disabled={isSyncing || !hasPendingChanges} 
                />

                {/* Durum Göstergeleri */}
                {isSyncing && (
                    <View style={styles.syncStatus}>
                        <ActivityIndicator size="small" />
                        <Text style={styles.syncText}>Eşitleniyor...</Text>
                    </View>
                )}

                {!isSyncing && !hasPendingChanges && (
                    <View style={styles.syncStatus}>
                        <Ionicons name="checkmark-circle" size={18} color="green" />
                        <Text style={[styles.syncText, { color: 'green' }]}>
                            Tüm verileriniz güncel.
                        </Text>
                    </View>
                )}

                {!isSyncing && hasPendingChanges && (
                    <View style={styles.syncStatus}>
                        <Ionicons name="cloud-upload-outline" size={18} color="orange" />
                        <Text style={[styles.syncText, { color: 'orange' }]}>
                            Eşitlenmeyi bekleyen değişiklikler var.
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 40,
    },
    statsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    statBox: {
        backgroundColor: '#f7f7f7',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    statLabel: {
        fontSize: 16,
        color: '#555',
        marginTop: 5,
    },
    syncContainer: {
        position: 'absolute',
        bottom: 40,
        width: '90%',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'center',
    },
    syncStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    syncText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#777',
    },
});