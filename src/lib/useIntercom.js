// src/lib/useIntercom.js
import { useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const useIntercom = (showDefaultLauncher = false) => {
    const { isLoggedIn, userName, userId, userEmail, userCreatedAt } = useAuth();

    useEffect(() => {
        if (isLoggedIn && userName) {
            // Check if Intercom script is already loaded
            if (!window.Intercom) {
                // Load Intercom script
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.src = 'https://widget.intercom.io/widget/zcgmjurf';

                // Set up Intercom settings
                window.intercomSettings = {
                    app_id: 'zcgmjurf',
                    name: userName,
                    user_id: userId || undefined,
                    email: userEmail || undefined,
                    hide_default_launcher: !showDefaultLauncher // Hide only if showDefaultLauncher is false
                };

                // Initialize Intercom once script loads
                script.onload = () => {
                    if (window.Intercom) {
                        window.Intercom('boot', window.intercomSettings);
                    }
                };

                document.head.appendChild(script);
            } else {
                // Intercom already loaded, just update
                window.Intercom('update', {
                    name: userName,
                    user_id: userId,
                    email: userEmail,
                    hide_default_launcher: !showDefaultLauncher
                });
            }
        }
    }, [isLoggedIn, userName, userId, userEmail, showDefaultLauncher]);

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