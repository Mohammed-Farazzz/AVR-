// Navigation Header Component

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface NavigationHeaderProps {
    currentLocation: string;
    destination: string;
    onCancel: () => void;
}

export default function NavigationHeader({
    currentLocation,
    destination,
    onCancel,
}: NavigationHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.locationInfo}>
                    <Text style={styles.label}>From</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                        {currentLocation}
                    </Text>
                </View>
                <View style={styles.arrow}>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
                <View style={styles.locationInfo}>
                    <Text style={styles.label}>To</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                        {destination}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.primary,
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationInfo: {
        flex: 1,
    },
    label: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 2,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    arrow: {
        marginHorizontal: 8,
    },
    cancelButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
