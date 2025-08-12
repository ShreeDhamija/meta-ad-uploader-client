import { useEffect } from 'react';
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
            });
        }
    }, [isLoggedIn, userName, userId, userEmail, userCreatedAt]);
};