// Step Card Component - Displays individual navigation step

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationStep } from '../utils/types';
import { COLORS, DIRECTION_NAMES, RADII, SHADOWS, SPACING } from '../utils/constants';

interface StepCardProps {
    step: NavigationStep;
    totalSteps: number;
    isActive: boolean;
}

export default function StepCard({ step, totalSteps, isActive }: StepCardProps) {
    return (
        <View style={[styles.container, isActive && styles.activeContainer]}>
            {/* Step number indicator */}
            <View style={styles.header}>
                <View style={[styles.stepBadge, isActive && styles.activeBadge]}>
                    <Text style={styles.stepBadgeText}>
                        {step.stepNumber}/{totalSteps}
                    </Text>
                </View>
                {step.completed && (
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.completedText}>Completed</Text>
                    </View>
                )}
            </View>

            {/* Main instruction */}
            <Text style={[styles.instruction, isActive && styles.activeInstruction]}>
                {step.instruction}
            </Text>

            {/* Distance and direction */}
            <View style={styles.details}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{step.distance}m</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Direction</Text>
                    <Text style={styles.detailValue}>{DIRECTION_NAMES[step.direction]}</Text>
                </View>
            </View>

            {/* Direction arrow */}
            <View style={styles.arrowContainer}>
                {getDirectionArrow(step.direction)}
            </View>
        </View>
    );
}

function getDirectionArrow(direction: string): React.ReactElement {
    const arrowMap: Record<string, string> = {
        north: 'arrow-up',
        south: 'arrow-down',
        east: 'arrow-forward',
        west: 'arrow-back',
        northeast: 'arrow-up-outline',
        northwest: 'arrow-up-outline',
        southeast: 'arrow-down-outline',
        southwest: 'arrow-down-outline',
    };

    const iconName = arrowMap[direction] || 'arrow-forward';
    const rotation = direction === 'northeast' ? 45 :
        direction === 'northwest' ? -45 :
            direction === 'southeast' ? 45 :
                direction === 'southwest' ? -45 : 0;

    return (
        <Ionicons
            name={iconName as any}
            size={48}
            color={COLORS.primary}
            style={{ transform: [{ rotate: `${rotation}deg` }] }}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: RADII.card,
        padding: SPACING.cardPadding,
        marginVertical: SPACING.cardMarginVertical,
        marginHorizontal: SPACING.cardMarginHorizontal,
        ...SHADOWS.soft,
    },
    activeContainer: {
        backgroundColor: '#EAF3FF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    stepBadge: {
        backgroundColor: '#ECECF0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    activeBadge: {
        backgroundColor: COLORS.primary,
    },
    stepBadgeText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    completedBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    completedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    instruction: {
        fontSize: 18,
        color: COLORS.text,
        lineHeight: 26,
        marginBottom: 16,
    },
    activeInstruction: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    arrowContainer: {
        alignItems: 'center',
    },
});
