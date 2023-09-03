import React, { ReactNode, useEffect, useState } from 'react';
import { useUser } from '../contexts/userContext';
import { useRouter } from 'next/router';
import socket from '../clientSocket';
import useCandidatesCount from '../hooks/useCandidateCount';

// Define the types for the Layout component's props
type LayoutProps = {
  children: ReactNode;
  userType?: 'normal' | 'admin';
};


// Main Layout component
export default function Layout({ children }: LayoutProps) {
  const { user, setUser, adminAddress, logout, etherBalance } = useUser();
  const router = useRouter();
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const numberOfCandidates = useCandidatesCount(socket);
  //const [etherBalance, setEtherBalance] = useState<number | null>(null);

  // Determine the current stage based on the router's pathname
  const stage = getStageFromPath(router.pathname);

  // useEffect to handle page/stage redirection to all users
  useEffect(() => {
    setForceUpdateKey(prevKey => prevKey + 1);
    socket.emit('requestBalance', user?.userAddress);
    
    socket.on('stageChanged', (newStage) => {
      if (router.pathname !== '/auth') {
        router.push(newStage);
      }
    });

    return () => {
      socket.off('stageChanged');
    };
  }, []);

  // Function to handle resetting elections
  const handleResetElections = async () => {
    if (!user || user.type !== 'admin') {
      alert("Only admin can reset the elections.");
      return;
    }
  
    socket.emit('resetElections');
    router.push('/viewUsers');
  };

  // Function to handle destroying the contract
  const handleDestroyContract = async () => {
    try {
      const response = await fetch('/api/destroyContract', {
          method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
          alert('Contract destroyed successfully!');
      } else {
          alert('Error destroying contract: ' + data.error);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  // Function to handle moving to the next stage
  const handleNextStage = () => {
    const currentStage = router.pathname;
    console.log('currentStage', currentStage);
    if (numberOfCandidates === 1 && currentStage === '/declareCandidacy') {
      router.push('/results');
      socket.emit('changeStage', '/vote');
      return;
    } else {
      socket.emit('changeStage', currentStage);
    }
  };

  return (
    <div key={forceUpdateKey}>
      <StageBanner stage={stage} />
      <UserContextBanner user={user} adminAddress={adminAddress} logout={logout} etherBalance={etherBalance} />
      <div>{children}</div>
      <Footer user={user} handleNextStage={handleNextStage} handleResetElections={handleResetElections} handleDestroyContract={handleDestroyContract} />
    </div>
  );
}

// Helper function to determine the stage based on the pathname
function getStageFromPath(pathname: string): string {
  const stageMap: { [key: string]: string } = {
    '/auth': 'Stage 1',
    '/viewUsers': 'Stage 1',
    '/declareCandidacy': 'Stage 2',
    '/vote': 'Stage 3',
    '/results': 'Stage 4',
  };
  return stageMap[pathname] || '';
}

// Component to display the stage banner
function StageBanner({ stage }: { stage: string }) {
  const router = useRouter();
  
  // Don't show the banner on the /auth page
  if (router.pathname === '/auth') return null;
  
  return <div className="stage-banner" style={{ textAlign: 'center' }}>{stage}</div>;
}

// Component to display the user context banner
function UserContextBanner({ user, adminAddress, logout, etherBalance }: any) {
  const router = useRouter();

  // Don't show the banner on the /auth page
  if (!user || router.pathname === '/auth') return null;
  
  return (
    <div className="user-banner" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        Username: {user.username} | Ether: {etherBalance !== null ? etherBalance : 'Loading...'} | User Address: {user.userAddress} | Admin Address: {adminAddress}
      </div>
      <button onClick={logout} style={{ marginLeft: '1rem' }}>Logout</button>
    </div>
  );
}

// Component to display the footer
function Footer({ user, handleNextStage, handleResetElections, handleDestroyContract }: any) {
  if (user?.type !== 'admin') return null;
  return (
    <footer>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={handleNextStage} style={{ fontSize: '2vw', marginTop: '1vw' }}>Next Stage</button>
        <button onClick={handleResetElections} style={{ fontSize: '2vw', marginTop: '1vw' }}>Restart</button>
        <button onClick={handleDestroyContract} style={{ fontSize: '2vw', marginTop: '1vw' }}>Destroy Contract</button>
      </div>
    </footer>
  );
}