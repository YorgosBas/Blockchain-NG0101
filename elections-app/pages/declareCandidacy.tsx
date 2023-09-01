import { useState, useEffect } from 'react';
import { User } from '../helpers/db';
import { useUser } from '../contexts/userContext';
import socket from '../clientSocket';

// DeclareCandidacy component for handling candidate registration
export default function DeclareCandidacy() {
  // State variables
  const [totalEther, setTotalEther] = useState(0);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [totalVoters, setTotalVoters] = useState<number>(0);
  const [requiredEther, setRequiredEther] = useState<number>(0);
  const [userEther, setUserEther] = useState(0);

  // Access the user from the UserContext
  const { user } = useUser();

  // useEffect to handle fetching candidates, total ether, and total voters
  useEffect(() => {
    // Emit socket events to fetch data
    socket.emit('fetchCandidates');
    socket.emit('fetchTotalEther');
    socket.emit('fetchTotalVoters');

    // Listen for candidates data and update state
    socket.on('candidatesData', (candidates) => {
      setCandidates(candidates);
    });

    // Listen for total ether data and update state
    socket.on('totalEtherData', (ether) => {
      setTotalEther(ether);
    });

    // Listen for total voters data and update state
    socket.on('totalVotersData', (voters) => {
      setTotalVoters(voters);
      setRequiredEther((0.01 * voters) - 0.01);
    });

    // Listen for new candidate data and update state
    socket.on('newCandidate', (candidates: User[]) => {
      setCandidates(candidates);
    });

    // Listen for updated total ether data and update state
    socket.on('updatedEther', (ether: number) => {
        setTotalEther(ether);
    });


    return () => {
      socket.off('candidatesData');
      socket.off('totalEtherData');
      socket.off('totalVotersData');
      socket.off('newCandidate');
      socket.off('updatedEther');
    };
  }, []);

  // Function to handle registering as a candidate
  const handleRegisterCandidate = () => {
    // Check if the user is logged in
    if (!user) {
      alert("You need to be logged in to register as a candidate.");
      return;
    }

    // Emit socket events to register as a candidate and request balance
    socket.emit('registerCandidate', { username: user.username, requiredEther, userEther });
  };

  // Render the component
  return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <h1>Declare the intention to become a president</h1>
      <p>Minimum Required Ether: {requiredEther.toFixed(2)} (0.01 Ether x Number of Voters)</p>
      <input 
        type="number" 
        value={userEther} 
        onChange={(e) => setUserEther(Number(e.target.value))} 
        placeholder="Enter your Ether amount/subscription"
      />
      <button onClick={handleRegisterCandidate}>Register for Candidate</button>

      <h2>Candidates:</h2>
      <ul>
        {candidates.map(candidate => (
          <li key={candidate.username}>
            {candidate.username} - Ether: {candidate.pledgedEther}
          </li>
        ))}
      </ul>
      <h3>Total Ether Contributed by Candidates: {totalEther}</h3>
    </div>
  );
}