// Location Card Component - Displays destination option

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CampusNode } from '../utils/types';
import { COLORS, LOCATION_ICONS, RADII, SHADOWS, SPACING } from '../utils/constants';

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
                <Ionicons
                    name={LOCATION_ICONS[location.type] as any}
                    size={22}
                    color={COLORS.primary}
                />
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
                        <Ionicons name="calendar-outline" size={12} color="#92400e" style={styles.eventIcon} />
                        <Text style={styles.eventText}>{location.eventInfo}</Text>
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
        borderRadius: RADII.card,
        padding: SPACING.cardPadding,
        marginVertical: SPACING.cardMarginVertical,
        marginHorizontal: SPACING.cardMarginHorizontal,
        ...SHADOWS.soft,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F7F7FB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
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
        backgroundColor: 'rgba(255, 159, 10, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 6,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventIcon: {
        marginRight: 6,
    },
    eventText: {
        fontSize: 11,
        color: COLORS.warning,
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
