// App Layout - Root layout for Expo Router

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { initializeAppData } from '../services/storageService';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    useEffect(() => {
        const prepare = async () => {
            await initializeAppData();
        };

        prepare()
            .catch(() => {})
            .finally(() => {
                SplashScreen.hideAsync().catch(() => {});
            });
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
