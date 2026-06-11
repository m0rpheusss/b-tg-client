"use client";

import React, { useEffect, useState } from 'react';
// 1. Remove parseInitDataQuery, we don't need it here anymore
import { init, mockTelegramEnv } from '@telegram-apps/sdk-react';
import {Spinner} from "@heroui/react";

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            // 2. Keep your raw mocked string query
            const initDataRaw = new URLSearchParams([
                ['user', JSON.stringify({
                    id: 9928,
                    first_name: 'John',
                    last_name: 'Doe',
                    username: 'johndoe',
                    language_code: 'en',
                })],
                ['hash', 'mocked_hash'],
                ['signature', 'mocked_signature'],
                ['auth_date', '1710000000'],
            ]).toString();

            mockTelegramEnv({
                launchParams: {
                    tgWebAppThemeParams: { bgColor: '#ffffff', textColor: '#000000' },
                    // 👇 FIX: Pass the raw query string directly, NOT the parsed object
                    tgWebAppData: initDataRaw,
                    tgWebAppVersion: '7.0',
                    tgWebAppPlatform: 'tdesktop',
                },
            });
        }

        try {
            init();
            setIsReady(true);
        } catch (error) {
            console.error("Failed to initialize Telegram SDK:", error);
        }
    }, []);

    if (!isReady) {
        return (
            <div style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div className="flex items-center gap-4">
                    <Spinner size="xl" />
                </div>
            </div>
        )
    }

    return <>{children}</>;
}