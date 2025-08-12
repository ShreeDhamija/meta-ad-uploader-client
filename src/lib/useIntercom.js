// src/lib/useIntercom.js
import { useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const useIntercom = () => {
    const { isLoggedIn, userName, userId, userEmail, userCreatedAt } = useAuth();

    useEffect(() => {
        if (isLoggedIn && userName) {
            // Load Intercom script if not already loaded
            if (!window.Intercom) {
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.src = 'https://widget.intercom.io/widget/zcgmjurf';
                document.head.appendChild(script);
            }

            // Set up Intercom settings
            window.intercomSettings = {
                app_id: 'zcgmjurf',
                name: userName,
                user_id: userId || undefined,
                email: userEmail || undefined,
                hide_default_launcher: true
            };

            // Initialize Intercom once script loads
            const initIntercom = () => {
                if (window.Intercom) {
                    window.Intercom('boot', window.intercomSettings);
                }
            };

            if (window.Intercom) {
                initIntercom();
            } else {
                script.onload = initIntercom;
            }
        }
    }, [isLoggedIn, userName, userId, userEmail]);

    const showMessenger = useCallback(() => {
        if (window.Intercom && isLoggedIn) {
            window.Intercom('show');
        }
    }, [isLoggedIn]);

    const hideMessenger = useCallback(() => {
        if (window.Intercom && isLoggedIn) {
            window.Intercom('hide');
        }
    }, [isLoggedIn]);

    return {
        showMessenger,
        hideMessenger,
    };
};