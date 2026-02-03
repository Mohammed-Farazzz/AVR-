// Location Card Component - Displays destination option

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CampusNode } from '../utils/types';
import { COLORS, LOCATION_ICONS } from '../utils/constants';

interface LocationCardProps {
    location: CampusNode;
    distance?: number;
    onPress: () => void;
}

export default function LocationCard({ location, distance, onPress }: LocationCardProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            {/* Icon */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{LOCATION_ICONS[location.type]}</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.name}>{location.name}</Text>
                {location.description && (
                    <Text style={styles.description}>{location.description}</Text>
                )}
                {distance !== undefined && (
                    <Text style={styles.distance}>{distance}m away</Text>
                )}
                {location.hasEvent && location.eventInfo && (
                    <View style={styles.eventBadge}>
                        <Text style={styles.eventText}>🎯 {location.eventInfo}</Text>
                    </View>
                )}
            </View>

            {/* Arrow */}
            <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>›</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginVertical: 6,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 24,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    distance: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    eventBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    eventText: {
        fontSize: 11,
        color: '#92400e',
        fontWeight: '500',
    },
    arrowContainer: {
        marginLeft: 8,
    },
    arrow: {
        fontSize: 24,
        color: COLORS.textSecondary,
    },
});
