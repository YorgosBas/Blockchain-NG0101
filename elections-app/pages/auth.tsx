import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/userContext';
import socket from '../clientSocket';
import { web3, electionContract } from '../web3Config';

// Auth component for handling user authentication
export default function Auth() {
  // State variables for login and registration forms
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerEthAddress, setRegisterEthAddress] = useState('');
  const router = useRouter();

  // Access the user from the UserContext
  const { user, setUser } = useUser();

  // useEffect to handle login and registration responses
  useEffect(() => {
    // Listen for login response and handle accordingly
    socket.on('loginResponse', (data) => {
      if (data.success) {
        alert(data.message);
        setUser(data.user);
        router.push('/viewUsers').then(() => window.location.reload());
      } else {
        alert(data.message);
      }
    });

    // Listen for registration response and handle accordingly
    socket.on('registerResponse', (data) => {
      if (data.success) {
        alert(data.message);
        setUser(data.user);
        router.push('/viewUsers').then(() => window.location.reload());
      } else {
        alert(data.message);
      }
    });

    // Cleanup: Remove socket listeners when component unmounts
    return () => {
      socket.off();
    };
  }, []);

  // Function to handle user registration
  async function handleRegister() {
    const newUserAddress = registerEthAddress; // Using provided Ethereum address

    // Register the voter on the blockchain
    try {
      await electionContract.methods.registerVoter().send({ from: newUserAddress });
    } catch (error) {
      console.error('Error during voter registration on blockchain:', error);
      alert('Credentials can not be blank. Please try again.');
      return;
    }

    let userEtherBalance = 0;
    let balanceInEtherString = '0';
    
    // Get the user's ether balance
    try {
        const balanceInWei = await web3.eth.getBalance(newUserAddress);
        balanceInEtherString = web3.utils.fromWei(balanceInWei, 'ether');
        userEtherBalance = parseFloat(balanceInEtherString);
    } catch (error) {
        console.error('Error fetching ether balance:', error);
    }

    // Create the new user object to be stored in the local database
    const newUser = {
        username: registerUsername,
        password: registerPassword,
        type: 'normal',
        candidacy: false,
        ether: userEtherBalance,
        votedFor: null,
        votesReceived: 0,
        pledgedEther: 0,
        measure: 0,
        userAddress: newUserAddress
    };

    socket.emit('registerUser', newUser);
  }

  // Function to handle user login
  function handleLogin() {
    socket.emit('loginUser', {
      username: loginUsername,
      password: loginPassword
    });
  }

  // Render the component
  return (
    <div style={{ flexDirection: 'column', display: 'flex', height: '100vh' }}>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '3vw' }}>Register for Elections or Log in</h2>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '90%', gap: '2vw', alignItems: 'center' }}>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5vw' }}>Login</h2>
            <div>
              <label style={{ fontSize: '2vw' }}>Username:</label>
              <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} style={{ width: '80%', fontSize: '2vw' }}/>
            </div>
            <div>
              <label style={{ fontSize: '2vw' }}>Password:</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ width: '80%', fontSize: '2vw' }} />
            </div>
            <button onClick={handleLogin} style={{ fontSize: '2vw' }}>Login</button>
          </div>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5vw' }}>Register</h2>
            <div>
              <label style={{ fontSize: '2vw' }}>Username:</label>
              <input type="text" value={registerUsername} onChange={e => setRegisterUsername(e.target.value)} style={{ width: '80%', fontSize: '2vw' }} />
            </div>
            <div>
              <label style={{ fontSize: '2vw' }}>Password:</label>
              <input type="password" value={registerPassword} onChange={e => setRegisterPassword(e.target.value)} style={{ width: '80%', fontSize: '2vw' }} />
            </div>
            <div>
              <label style={{ fontSize: '2vw' }}>Eth Address:</label>
              <input type="text" value={registerEthAddress} onChange={e => setRegisterEthAddress(e.target.value)} style={{ width: '80%', fontSize: '2vw' }} />
            </div>
            <button onClick={handleRegister} style={{ fontSize: '2vw' }}>Register</button>
          </div>
        </div>
      </div>
    </div>
  );
}