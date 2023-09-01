import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

const useCandidatesCount = (socket: Socket) => {
    const [numberOfCandidates, setNumberOfCandidates] = useState(0);

    useEffect(() => {
        if (!socket) return;

        socket.emit('fetchNumberOfCandidates');

        socket.on('numberOfCandidatesData', (count: number) => {
            setNumberOfCandidates(count);
        });

        return () => {
            socket.off('numberOfCandidatesData');
        };
    }, [socket]);

    return numberOfCandidates;
};

export default useCandidatesCount;