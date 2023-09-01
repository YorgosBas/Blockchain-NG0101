// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Election {

    struct User {
        address userAddress;
        bool hasVoted;
        address votedFor; // Address of the candidate this user has voted for
        uint256 votesReceived;
        uint256 pledgedEther;
        bool isCandidate;
        uint256 measure;
    }

    mapping(address => User) public users;
    uint256 public totalVoters;
    uint256 constant requiredEtherMultiplier = 0.01 ether;

    event CandidateRegistered(address indexed candidate, uint256 pledgedEther);
    event Voted(address voter, address candidate, uint256 amount);
    event InsufficientEther(address indexed user, uint256 providedEther, uint256 requiredEther);
    event UserAlreadyCandidate(address indexed user);
    event InvalidEtherAmount(address indexed user, uint256 providedEther);
    event EtherBalanceUpdated(address indexed _userAddress, uint256 balance);

    function registerVoter() public {
        require(users[msg.sender].userAddress == address(0), "User already registered");

        User memory newUser = User({
            userAddress: msg.sender,
            hasVoted: false,
            votedFor: address(0),
            votesReceived: 0,
            pledgedEther: 0,
            isCandidate: false,
            measure: 0
        });

        users[msg.sender] = newUser;
        totalVoters++;
    }

    constructor() {
        totalVoters = 0;
        owner = msg.sender;
    }

    modifier userExists() {
        require(users[msg.sender].userAddress != address(0), "User does not exist");
        _;
    }

    modifier notAlreadyCandidate() {
        require(!users[msg.sender].isCandidate, "User is already a candidate");
        _;
    }

    modifier validEther(uint256 _pledgedEther) {
        uint256 required = requiredEtherMultiplier * totalVoters;
        require(_pledgedEther > 0, "Enter a valid amount of Ether");
        require(_pledgedEther >= required, "Your amount is below the minimum required ether");
        require(msg.sender.balance >= _pledgedEther, "Not enough Ether in your wallet");
        _;
    }

    function registerCandidate(uint _pledgedEther) 
        public 
        payable 
        userExists 
        notAlreadyCandidate 
        validEther(_pledgedEther) 
    {
        require(msg.value == _pledgedEther, "Sent ether does not match the pledged amount");

        users[msg.sender].pledgedEther += _pledgedEther;
        users[msg.sender].measure = _pledgedEther / (requiredEtherMultiplier * totalVoters);
        users[msg.sender].isCandidate = true;

        emit CandidateRegistered(msg.sender, _pledgedEther);
    }


    function castVote(address candidateAddress) public userExists {
        User storage voter = users[msg.sender];
        User storage candidate = users[candidateAddress];

        require(!voter.hasVoted, "User has already voted");
        require(candidate.isCandidate, "Voted address is not a candidate");
        require(candidate.pledgedEther >= candidate.measure, "Candidate does not have enough ether to reward");
        require(address(msg.sender).balance >= 0.01 ether, "Not enough Ether in your wallet to perform this transaction");

        voter.hasVoted = true;
        voter.votedFor = candidateAddress;
        candidate.votesReceived += 1;

        uint256 amountToTransfer = candidate.measure * 1 ether; // Convert to Wei if measure is in Ether
        require(address(candidateAddress).balance >= amountToTransfer, "Candidate does not have enough Ether");

        // Transfer the measure of ether from candidate to voter
        payable(msg.sender).transfer(amountToTransfer);
        candidate.pledgedEther -= candidate.measure;

        emit Voted(msg.sender, candidateAddress, amountToTransfer);  // Emitting an event
    }

    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can execute this");
        _;
    }

    function transferRemainingEtherToAdmin(address payable adminAddress) public onlyOwner {
        uint256 contractBalance = address(this).balance;
        adminAddress.transfer(contractBalance);
    }

    // New function to get ether balance of an address
    function getEtherBalance(address _userAddress) public view returns (uint256) {
        return address(_userAddress).balance;
    }

    function updateAndEmitEtherBalance(address _userAddress) public {
        uint256 balance = address(_userAddress).balance;
        emit EtherBalanceUpdated(_userAddress, balance);
    }

    function destroy() public onlyOwner {
        selfdestruct(payable(owner));
    }

}