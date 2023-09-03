import { createServer } from 'http';
import next from 'next';
import { readDB, writeDB, readWinnersDB, writeWinnersDB } from './helpers/db';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { User } from './helpers/db';
import express from 'express';


const {Web3} = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545")); // This assumes you're using Ganache or a local Ethereum node

const contractData = require('./build/contracts/Election.json');
const contractABI = contractData.abi;
const contractAddress = contractData.networks["5777"].address;
const electionContract = new web3.eth.Contract(contractABI, contractAddress);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const { initializeSocket } = require('./socket');
let currentStage = '/viewUsers'; // Initial stage

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = initializeSocket(httpServer);

    server.use(express.json());
    

    io.on('connection', (socket: Socket) => {
        
        // STAGE 1
        // Listener to register a new user in the local DB. Used in /auth
        socket.on('registerUser', async (newUser) => {
            try {
                const db = readDB();
                const existingUser = db.users.find((u: User) => u.username === newUser.username);
                const accounts = await web3.eth.getAccounts();
        
                // Validation for empty fields
                if (!newUser.username.trim() || !newUser.password.trim() || !newUser.userAddress.trim()) {
                    socket.emit('registerResponse', { success: false, message: 'Username, password, or Ethereum address cannot be blank.' });
                    return;
                }
        
                // Check if the Ethereum address is valid
                if (!Web3.utils.isAddress(newUser.userAddress)) {
                    socket.emit('registerResponse', { success: false, message: 'Invalid Ethereum address.' });
                    return;
                }
        
                // Check if Ethereum address is one of the Ganache preconfigured accounts
                if (!accounts.includes(newUser.userAddress)) {
                    socket.emit('registerResponse', { success: false, message: 'The provided Ethereum address is not recognized. Please provide a valid Ganache account address.' });
                    return;
                }
                
                // Check if username is already taken
                if (existingUser) {
                    socket.emit('registerResponse', { success: false, message: 'Username already taken.' });
                    return;
                }

                db.users.push(newUser);
                writeDB(db);
                socket.emit('registerResponse', { success: true, message: 'User registered successfully!', user: newUser });
                io.emit('newUserRegistered', newUser);
            } catch (error) {
                console.error('Error during user registration:', error);
                socket.emit('registerResponse', { success: false, message: 'An unexpected error occurred during registration.' });
            }
        });
    
        // Listener to login a user. Used in /auth
        socket.on('loginUser', (credentials) => {
            const db = readDB();
            const existingUser = db.users.find((u: User) => u.username === credentials.username && u.password === credentials.password);
            if (existingUser) {
                socket.emit('loginResponse', { success: true, user: existingUser });
            } else {
                socket.emit('loginResponse', { success: false, message: 'Invalid username or password' });
            }
        });

        // STAGE 1 in /viewUsers
        // Listener to fetch the count of users of type "normal". Used in /viewUsers
        socket.on('getUserCount', () => {
            const db = readDB();
            const normalUsers = db.users.filter((user: User) => user.type === 'normal');
            socket.emit('userCount', normalUsers.length);
        });

        // Listener to fetch all users of type "normal". Used in /viewUsers
        socket.on('getUsers', () => {
            const db = readDB();
            const normalUsers = db.users.filter((user: User) => user.type === 'normal');
            socket.emit('usersList', normalUsers);
        });

        // Listener to fetch all previous winners. Used in /viewUsers
        socket.on('fetchAllWinners', () => {
            const winnersDB = readWinnersDB();
            socket.emit('allWinnersData', winnersDB);
        });

        //STAGE 2
        // Listener to fetch all registered candidates. Used in /declareCandidacy
        socket.on('fetchCandidates', () => {
            const db = readDB();
            const candidates = db.users.filter((user: { candidacy: boolean; }) => user.candidacy === true);
            socket.emit('candidatesData', candidates);
        });
    
        // Listener to fetch the total ether pledged by all candidates. Used in /declareCandidacy
        socket.on('fetchTotalEther', () => {
            const db = readDB();
            const totalEther = db.users
                .filter((user: { candidacy: boolean; }) => user.candidacy === true)
                .reduce((acc: number, user: User) => acc + user.pledgedEther, 0);
            socket.emit('totalEtherData', totalEther);
        });

        // Listener to fetch the total number of voters. Used in /declareCandidacy
        socket.on('fetchTotalVoters', () => {
            const db = readDB();
            const totalVoters = db.users.length;
            socket.emit('totalVotersData', totalVoters);
        });

        // Listener to fetch the minimum required ether to be a candidate. Used in /declareCandidacy
        socket.on('requestBalance', async (userAddress) => {
            try {
                if (!web3.utils.isAddress(userAddress)) {
                    console.error('HERE Invalid Ethereum address:', userAddress);
                    return;
                }
                // Fetch the balance in wei
                const balanceWei = await web3.eth.getBalance(userAddress);
        
                // Convert wei to ether
                const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
        
                // Emit the balance
                socket.emit('balanceUpdate', { userAddress, balanceEther });
            } catch (error) {
                console.error('Error fetching balance:', error);
            }
        });
    
        // Listener to register a new candidate. Used in /declareCandidacy
        socket.on('registerCandidate', async ({ username, requiredEther, userEther: pledgedEther }) => {
            const db = readDB();
            const userIndex = db.users.findIndex((u: User) => u.username === username);
            const user = db.users[userIndex];
    
            if (!user) {
                socket.emit('error', { message: 'User not found' });
                return;
            }
    
            if (user.candidacy) {
                socket.emit('error', { message: 'You are already registered as a candidate' });
                return;
            }

            if (pledgedEther <= 0) {
                socket.emit('error', { message: 'Enter a valid amount of Ether' });
                return;
            }
    
            if (pledgedEther < requiredEther) {
                socket.emit('error', { message: 'Your amount is below the minimum required ether' });
                return;
            }
            if (pledgedEther > user.ether) {
                socket.emit('error', { message: 'Not enough Ether in your wallet' });
                return;
            }

            const transaction = await electionContract.methods.registerCandidate(pledgedEther).send({
                from: user.userAddress,
                value: web3.utils.toWei(pledgedEther.toString(), 'ether')
            });
            
            // Apply changes to the local DB
            user.pledgedEther = (user.pledgedEther || 0) + pledgedEther;
            user.measure = parseFloat((pledgedEther / (requiredEther / 0.01)).toFixed(2)); // Calculate the measure pledgedEther / TotalVoters
            user.ether -= pledgedEther;
            user.candidacy = true;
            db.users[userIndex] = user;
            writeDB(db);
            const candidates = db.users.filter((user: { candidacy: boolean; }) => user.candidacy === true);
            io.emit('newCandidate', candidates); // Emit the change to all clients

            // Emit updated total ether
            const totalEther = db.users
                .filter((user: { candidacy: boolean; }) => user.candidacy === true)
                .reduce((acc: number, user: User) => acc + user.pledgedEther, 0);
            io.emit('updatedEther', totalEther); // Emit the change to all clients

            socket.emit('requestBalance', user.userAddress);
        });

        // Listener to fetch the total number of candidates. Used to jump directly to results if there's only one candidate
        socket.on('fetchNumberOfCandidates', () => {
            const db = readDB();
            const numberOfCandidates = db.users.filter((user: User) => user.candidacy === true).length;
            socket.emit('numberOfCandidatesData', numberOfCandidates);
        });
        
        // STAGE 3
        // Listener to cast vote. Used in /vote
        socket.on('castVote', async (voteData: { voteName: string, username: string }) => {
            const db = readDB();
            const voter = db.users.find((u: User) => u.username === voteData.username);
            const candidate = db.users.find((u: User) => u.username === voteData.voteName);
        
            if (!voter || !candidate) {
                socket.emit('voteResponse', { success: false, message: 'Voter or Candidate not found' });
                return;
            }
        
            if (voter.votedFor) {
                socket.emit('voteResponse', { success: false, message: 'You have already voted' });
                return;
            }

            if (candidate.pledgedEther < candidate.measure) {
                socket.emit('voteResponse', { success: false, message: 'No more ether to reward' });
                return;
            }

            try {
                // Interact with the smart contract to cast the vote and transfer ether
                await electionContract.methods.castVote(candidate.userAddress).send({
                    from: voter.userAddress
                });
        
                // Update local DB
                voter.votedFor = voteData.voteName;
                candidate.votesReceived += 1;
                voter.ether += candidate.measure;
                candidate.pledgedEther -= candidate.measure;
                writeDB(db);

                socket.emit('voteResponse', { success: true, message: `You voted for ${voteData.voteName} and received ${candidate.measure} Ether` });

                // Broadcast to all clients that the candidates list might have changed.
                io.emit('candidatesData', db.users.filter((u: { candidacy: any; }) => u.candidacy)); // Emit the change to all clients

                socket.emit('requestBalance', voter.userAddress);
                socket.emit('requestBalance', candidate.userAddress);
            } catch (error) {
                console.error('Error casting vote:', error);
                socket.emit('voteResponse', { success: false, message: 'Error casting vote' });
            }
        });

        // STAGE 4
        socket.on('fetchResults', () => {
            const db = readDB();
            
            // Get users with candidacy set to true
            const candidates = db.users.filter((u: User) => u.candidacy === true);
            
            // Find the candidate(s) with the maximum votes
            let maxVotes = Math.max(...candidates.map((u: User) => u.votesReceived));
            let topVoters = candidates.filter((u: User) => u.votesReceived === maxVotes);
            
            // If there's a tie in votes, use measure to break it
            if (topVoters.length > 1) {
                let maxMeasure = Math.max(...topVoters.map((u: User) => u.measure));
                topVoters = topVoters.filter((u: User) => u.measure === maxMeasure);
            }
            
            // If there's still a tie after considering measure, choose one randomly
            if (topVoters.length > 1) {
                const randomIndex = Math.floor(Math.random() * topVoters.length);
                topVoters = [topVoters[randomIndex]];
            }
            
            // At this point, we have a single winner
            const winner = topVoters[0];
            const winnersDB = readWinnersDB();
            winnersDB.push(winner.username);
            writeWinnersDB(winnersDB);
            // Calculate the total remaining pledged ether
            const totalRemainingPledgedEther = candidates.reduce((acc: number, candidate: User) => acc + candidate.pledgedEther, 0);
            
            io.emit('electionResults', { winner, totalRemainingPledgedEther });
        });

        socket.on('transferEtherToKYD', async () => {
            try {
                // Fetch the admin Ethereum address
                const response = await fetch('http://localhost:3000/api/getAdmin');
                const data = await response.json();
                let db = readDB();
        
                if (data.userAddress) {
                    // Calculate the total remaining pledged ether
                    const totalRemainingPledgedEther = db.users
                        .filter((user: { candidacy: boolean; }) => user.candidacy === true)
                        .reduce((acc: number, user: User) => acc + user.pledgedEther, 0);
        
                    // Update the admin's ether balance in the local database
                    const admin = db.users.find((user: User) => user.userAddress === data.userAddress);
                    if (admin) {
                        admin.ether += totalRemainingPledgedEther;
                        // Update the database with the new admin data
                        writeDB(db);
                    }
        
                    // Interact with the smart contract to transfer the remaining ether
                    await electionContract.methods.transferRemainingEtherToAdmin(data.userAddress).send({
                        from: data.userAddress // This should be the Ethereum address that deployed the contract
                    });
        
                    socket.emit('etherTransferredMessage', `A total of ${totalRemainingPledgedEther} ether was transferred to KYD.`);
                } else {
                    socket.emit('etherTransferredMessage', `Error: Admin Ethereum address not found.`);
                }
            } catch (error) {
                console.error('Error transferring ether to KYD:', error);
                socket.emit('etherTransferredMessage', `Error transferring ether to KYD.`);
            }
        });

        // Layout listeners
        socket.on('changeStage', (currentStage) => {
            let nextStage = '';
            if (currentStage === '/viewUsers') {
                nextStage = '/declareCandidacy';
            } else if (currentStage === '/declareCandidacy') {
                nextStage = '/vote';
            } else if (currentStage === '/vote') {
                nextStage = '/results';
            }
            if (nextStage) {
              io.emit('stageChanged', nextStage);
            }
        });

        socket.on("resetElections", () => { 
            try {
              const db = readDB();
              db.users = db.users.filter((user: User) => user.type === "admin");
              db.users = db.users.map((user: User) => {
                user.candidacy = false;
                return user;
              });
              writeDB(db);
              socket.emit("electionsReset", { message: "Elections reset successfully and all non-admin users have been deleted" });
            } catch (error) {
              socket.emit("electionsResetError", { error: "Internal Server Error" });
            }
        });

        socket.on('requestUserEther', (username: string) => {
            const db = readDB();
            const user = db.users.find((user: User) => user.username === username);
            socket.emit('userEtherData', user.ether);
        });

    });

    server.all('*', (req, res) => handle(req, res));

    httpServer.listen(3000, () => {
        console.log('Server listening on port 3000');
    });
});