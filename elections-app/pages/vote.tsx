import { useState, useEffect } from 'react';
import socket from '../clientSocket';
import { User } from '../helpers/db';
import { useUser } from '../contexts/userContext';

// Vote component for casting votes
export default function Vote() {
  // State to hold the list of candidates
  const [candidates, setCandidates] = useState<User[]>([]);
  // State to hold the name of the candidate to vote for
  const [voteName, setVoteName] = useState('');
  // Access the user from the UserContext
  const { user } = useUser();

  // useEffect to handle socket events and initial data fetching
  useEffect(() => {
    // Request the balance of the current user
    socket.emit('requestBalance', user?.userAddress);
    // Request the list of candidates
    socket.emit('fetchCandidates');

    // Listen for the list of candidates and update state
    socket.on('candidatesData', (candidates: User[]) => {
      setCandidates(candidates);
    });

    // Listen for the vote response and handle it
    socket.on('voteResponse', (response) => {
      if (response.success) {
        alert(response.message);
      } else {
        console.error(response.message);
      }
    });

    // Cleanup: Remove socket listeners when component unmounts
    return () => {
      socket.off('candidatesData');
      socket.off('voteResponse');
    };
  }, []);

  // Function to handle voting
  const handleVote = () => {
    // Validate that a candidate name is entered
    if (!voteName) {
      alert('Please enter a candidate name.');
      return;
    }

    // Validate that the user is logged in
    if (!user) {
      alert("You need to be logged in to vote.");
      return;
    }

    // Emit the vote and the user's balance request
    socket.emit('castVote', { voteName, username: user.username });
  };

  // Render the component
  return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <h1>Vote for Candidate</h1>

      <h2>Candidates:</h2>
      <ul>
        {/* List out the candidates */}
        {candidates.map(candidate => (
          <li key={candidate.username}>
            {candidate.username} - Ether: {candidate.pledgedEther}
          </li>
        ))}
      </ul>

      <div>
        {/* Input for entering the candidate name */}
        <input
          type="text"
          placeholder="Enter candidate name"
          value={voteName}
          onChange={e => setVoteName(e.target.value)}
        />
        {/* Button to cast the vote */}
        <button onClick={handleVote}>Vote</button>
      </div>
    </div>
  );
}