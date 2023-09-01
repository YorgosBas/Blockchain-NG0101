import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

const usePreviousWinners = (socket: Socket) => {
    const [winners, setWinners] = useState([]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('fetchPreviousWinners');

        socket.on('previousWinnersData', (data: string[]) => {
            setWinners(data);
        });

        return () => {
            socket.off('previousWinnersData');
        };
    }, [socket]);

    return winners;
};

export default usePreviousWinners;