// App Layout - Root layout for Expo Router

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeAppData } from '../services/storageService';

export default function RootLayout() {
    useEffect(() => {
        // Initialize app data on startup
        initializeAppData();
    }, []);

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#f8fafc' },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="destinations" />
            <Stack.Screen name="navigate" />
            <Stack.Screen name="ar-guide" />
        </Stack>
    );
}
