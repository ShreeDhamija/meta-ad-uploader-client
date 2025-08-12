// src/lib/useIntercom.js
import { useEffect, useCallback } from 'react';
import { boot, show, hide, update } from '@intercom/messenger-js-sdk';
import { useAuth } from './AuthContext';

export const useIntercom = () => {
    const { isLoggedIn, userName, userId, userEmail, userCreatedAt } = useAuth();

    useEffect(() => {
        console.log("[Intercom] useEffect ran", { isLoggedIn, userName, userId, userEmail, userCreatedAt });
        if (isLoggedIn && userName && userId && userEmail) {
            console.log("[Intercom] Booting...");


            boot({
                app_id: 'zcgmjurf',
                user_id: userId,
                name: userName,
                email: userEmail,
                // created_at: createdAtTimestamp,
                hide_default_launcher: true,
            });
        }
    }, [isLoggedIn, userName, userId, userEmail, userCreatedAt]);


    // Methods to control the messenger
    const showMessenger = useCallback(() => {
        if (isLoggedIn) {
            show();
        }
    }, [isLoggedIn]);

    const hideMessenger = useCallback(() => {
        if (isLoggedIn) {
            hide();
        }
    }, [isLoggedIn]);

    return {
        showMessenger,
        hideMessenger,
    };
};