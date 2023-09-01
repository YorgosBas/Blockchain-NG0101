import Web3 from 'web3';

// Set up the web3 instance
const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));

// Load contract data
import contractData from './build/contracts/Election.json';

// Extract ABI and the address
const contractABI = contractData.abi as any[];
const contractAddress = contractData.networks["5777"].address;

// Create the contract instance
const electionContract = new web3.eth.Contract(contractABI, contractAddress);

// Export the necessary items
export {
    web3,
    electionContract
};