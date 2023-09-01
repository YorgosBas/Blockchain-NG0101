import { useState, useEffect } from 'react';
import socket from '../clientSocket';
import { User } from '../helpers/db';
import { useUser } from '../contexts/userContext';

// Results component for displaying election results
export default function Results() {
  // State to hold the winner of the election
  const [winner, setWinner] = useState<User | null>(null);
  // Access the user from the UserContext
  const { user } = useUser();
  // State to track if the "Transfer Ether to KYD" button has been pressed
  const [buttonPressed, setButtonPressed] = useState(false);

  // useEffect to handle fetching election results and ether transfer messages
  useEffect(() => {
    // Request the election results
    socket.emit('fetchResults');

    // Listen for the election results and update the winner state
    socket.on('electionResults', (data) => {
      setWinner(data.winner);
    });

    // Listen for the ether transfer message and display an alert
    socket.on('etherTransferredMessage', (message: string) => {
      alert(message);
    });

    // Cleanup: Remove socket listeners when component unmounts
    return () => {
      socket.off('electionResults');
      socket.off('etherTransferredMessage');
    };
  }, []);

  // Function to handle transferring Ether to KYD
  const handleTransferToKYD = () => {
    // Prevent multiple clicks
    if (buttonPressed) return;
    setButtonPressed(true);
    // Emit the transfer event
    socket.emit('transferEtherToKYD');
  };

  // Render the component
  return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <h1>Election Results</h1>
      {winner ? (
        <div>
          <h2>Winner:</h2>
          <p>
            {winner.username} with {winner.votesReceived} votes.
          </p>
        </div>
      ) : (
        <p>Results are being calculated...</p>
      )}
      <div>
        {/* Show the "Transfer Ether to KYD" button only to admins */}
        {user?.type === 'admin' && (
          <button onClick={handleTransferToKYD}>Transfer Ether to KYD</button>
        )}
      </div>
    </div>
  );
}