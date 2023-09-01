import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '../helpers/db.js';
import socket from '../clientSocket';


// Define the shape of the UserContext
type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  adminAddress: string | null;
  setAdminAddress: React.Dispatch<React.SetStateAction<string | null>>;
  logout: () => void;
  etherBalance: number | null;
};

// Create the UserContext with undefined initial value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Define the props for the UserProvider component
type UserProviderProps = {
  children: ReactNode;
};

// Create the UserProvider component
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const router = useRouter();
  const [etherBalance, setEtherBalance] = useState<number | null>(null);

  // Load user and adminAddress from local storage when component mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAdminAddress = localStorage.getItem('adminAddress');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (storedAdminAddress) {
      setAdminAddress(storedAdminAddress);
    }
  }, []);


  // Fetch the updated ether balance of the user
  useEffect(() => {
    socket.emit('requestBalance', user?.userAddress);
    socket.on('balanceUpdate', (data) => {
      if (data.userAddress === user?.userAddress) {
        setEtherBalance(parseFloat(data.balanceEther));
      }
    });
  
    return () => {
      socket.off('balanceUpdate');
    };
  }, [user]);

  // Fetch adminAddress from API whenever user changes
  useEffect(() => {
    if (user) {
      fetch('/api/getAdmin')
        .then(response => response.json())
        .then(data => {
          if (data.userAddress) {
            setAdminAddress(data.userAddress);
          }
        });
    }
  }, [user]);

  // Update local storage whenever user or adminAddress changes
  useEffect(() => {
    if (user) {
      const userString = JSON.stringify(user, (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString(); // convert BigInt to string
        }
        return value;
      });
      localStorage.setItem('user', userString);
    } else {
      localStorage.removeItem('user');
    }
  
    if (adminAddress) {
      localStorage.setItem('adminAddress', adminAddress);
    } else {
      localStorage.removeItem('adminAddress');
    }
  }, [user, adminAddress]);

  // Logout function to clear user and adminAddress
  const logout = () => {
    setUser(null);
    setAdminAddress(null);
    router.push('/auth');
  };

  return (
    <UserContext.Provider value={{ user, setUser, adminAddress, setAdminAddress, logout, etherBalance }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};