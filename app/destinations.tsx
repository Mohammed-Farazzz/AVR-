// Destination Selection Screen

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CampusNode } from '../utils/types';
import { getCampusMap } from '../services/storageService';
import { getAvailableDestinations, findRoute } from '../utils/pathfinding';
import LocationCard from '../components/LocationCard';
import { COLORS } from '../utils/constants';

export default function DestinationsScreen() {
    const router = useRouter();
    const { startLocationId } = useLocalSearchParams<{ startLocationId: string }>();

    const [loading, setLoading] = useState(true);
    const [startLocation, setStartLocation] = useState<CampusNode | null>(null);
    const [destinations, setDestinations] = useState<Array<{ node: CampusNode; distance: number }>>([]);
    const [accessibleOnly, setAccessibleOnly] = useState(false);

    useEffect(() => {
        loadDestinations();
    }, [accessibleOnly]);

    const loadDestinations = async () => {
        setLoading(true);

        const campusMap = await getCampusMap();
        if (!campusMap || !startLocationId) {
            setLoading(false);
            return;
        }

        const start = campusMap.nodes[startLocationId];
        setStartLocation(start);

        const availableDestinations = getAvailableDestinations(
            campusMap,
            startLocationId,
            accessibleOnly
        );

        setDestinations(availableDestinations);
        setLoading(false);
    };

    const handleDestinationSelect = async (destination: CampusNode) => {
        if (!startLocationId) return;

        const campusMap = await getCampusMap();
        if (!campusMap) return;

        const route = findRoute(campusMap, startLocationId, destination.id, accessibleOnly);
        if (!route) return;

        router.push({
            pathname: '/navigate',
            params: {
                routeData: JSON.stringify(route),
                startLocationId,
                destinationId: destination.id,
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading destinations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>‹</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Select Destination</Text>
                    {startLocation && (
                        <Text style={styles.subtitle}>From: {startLocation.name}</Text>
                    )}
                </View>
            </View>

            {/* Accessibility toggle */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, accessibleOnly && styles.filterButtonActive]}
                    onPress={() => setAccessibleOnly(!accessibleOnly)}
                >
                    <Ionicons
                        name="accessibility"
                        size={18}
                        color={accessibleOnly ? '#fff' : COLORS.text}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.filterText, accessibleOnly && styles.filterTextActive]}>
                        Accessible Routes Only
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Destinations list */}
            {destinations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No destinations available</Text>
                </View>
            ) : (
                <FlatList
                    data={destinations}
                    keyExtractor={(item) => item.node.id}
                    renderItem={({ item }) => (
                        <LocationCard
                            location={item.node}
                            distance={item.distance}
                            onPress={() => handleDestinationSelect(item.node)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    backText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '300',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    filterContainer: {
        padding: 16,
    },
    filterButton: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    filterButtonActive: {
        backgroundColor: COLORS.accessible,
        borderColor: COLORS.accessible,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    filterTextActive: {
        color: '#fff',
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
});
