import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

const useUserEther = (socket: Socket, username: string) => {
    const [userEther, setUserEther] = useState<number | null>(null);

    useEffect(() => {
        if (!socket || !username) return;

        socket.emit('requestUserEther', username);

        socket.on('userEtherData', (ether: number) => {
            setUserEther(ether);
        });

        return () => {
            socket.off('userEtherData');
        };
    }, [socket, username]);

    return userEther;
};

export default useUserEther;