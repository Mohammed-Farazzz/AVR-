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
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={styles.locationInfo}>
                    <Text style={styles.label}>To</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                        {destination}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Ionicons name="close" size={18} color={COLORS.text} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.background,
        paddingTop: 54,
        paddingBottom: 18,
        paddingHorizontal: 20,
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
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    locationText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    arrow: {
        marginHorizontal: 8,
    },
    cancelButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
});
