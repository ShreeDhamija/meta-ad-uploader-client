import { useEffect, useCallback } from 'react';
import Intercom from '@intercom/messenger-js-sdk';
import { useAuth } from './AuthContext';

export const useIntercom = () => {
    const { isLoggedIn, userName, userId, userEmail, userCreatedAt } = useAuth();

    useEffect(() => {
        if (isLoggedIn && userName) {
            // Convert createdAt to Unix timestamp (seconds) if it exists
            const createdAtTimestamp = userCreatedAt ?
                Math.floor(new Date(userCreatedAt).getTime() / 1000) :
                undefined;

            Intercom({
                app_id: 'zcgmjurf',
                user_id: userId,
                name: userName,
                email: userEmail,
                created_at: createdAtTimestamp,
                hide_default_launcher: true, // Hide the default chat bubble
            });
        }
    }, [isLoggedIn, userName, userId, userEmail, userCreatedAt]);

    // Methods to control the messenger
    const showMessenger = useCallback(() => {
        if (isLoggedIn) {
            Intercom('show');
        }
    }, [isLoggedIn]);

    const hideMessenger = useCallback(() => {
        if (isLoggedIn) {
            Intercom('hide');
        }
    }, [isLoggedIn]);

    const updateMessenger = useCallback((settings) => {
        if (isLoggedIn) {
            Intercom('update', settings);
        }
    }, [isLoggedIn]);

    return {
        showMessenger,
        hideMessenger,
        updateMessenger,
    };
};