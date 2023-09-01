import { useEffect, useState } from 'react';
import { User } from '../helpers/db';
import socket from '../clientSocket';

// ViewUsers component for displaying registered users and previous winners
export default function ViewUsers() {
  // State to hold the list of users
  const [users, setUsers] = useState<User[]>([]);
  // State to hold the count of normal users
  const [normalUsersCount, setNormalUsersCount] = useState<number>(0);
  // State to hold the list of all winners
  const [allWinners, setAllWinners] = useState<string[]>([]);

  // useEffect to handle user count
  useEffect(() => {
    // Request the count of normal users
    socket.emit('getUserCount');

    // Listen for the user count and update state
    socket.on('userCount', (count: number) => {
      setNormalUsersCount(count);
    });

    return () => {
      socket.off('userCount');
    };
  }, []);

  // useEffect to handle users list
  useEffect(() => {
    // Request the initial list of users
    socket.emit('getUsers');

    // Listen for the list of users and update state
    socket.on('usersList', (usersList: User[]) => {
      setUsers(usersList);
    });

    // Listen for a new user registration event and update state
    socket.on('newUserRegistered', (newUser: User) => {
      setUsers(prevUsers => [...prevUsers, newUser]);
      if (newUser.type === 'normal') {
        setNormalUsersCount(prevCount => prevCount + 1);
      }
    });

    return () => {
      socket.off('usersList');
      socket.off('newUserRegistered');
    };
  }, []);

  // useEffect to handle fetching all winners
  useEffect(() => {
    // Request the list of all winners
    socket.emit('fetchAllWinners');

    // Listen for the list of all winners and update state
    socket.on('allWinnersData', (winners: string[]) => {
      setAllWinners(winners);
    });

    return () => {
      socket.off('allWinnersData');
    };
  }, []);
  
  // Render the component
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '3vw' }}>Registered Users: {normalUsersCount}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '90%', gap: '2vw', alignItems: 'center' }}>
          <ul>
            {/* List out the users */}
            {users.map(user => (
              <li key={user.username}>{user.username}</li>
            ))}
          </ul>
        </div>
        <h2 style={{ fontSize: '3vw' }}>Previous Winners</h2>
        <ul>
          {/* List out the previous winners */}
          {allWinners.map(winnerName => (
            <li key={winnerName}>{winnerName}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}