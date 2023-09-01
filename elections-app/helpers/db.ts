import fs from 'fs';
import path from 'path';

// Define the path to the database file
const dbPath = path.join(process.cwd(), 'data/db.json');
const winnersDBPath = path.join(process.cwd(), 'data/winnersDB.json');

// Function to read the database
export function readDB() {
    // Check if the database file exists
    if (!fs.existsSync(dbPath)) {
        // Return an initial structure if the file doesn't exist
        return { users: [] };
    }

    // Read and parse the database file
    const fileContent = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(fileContent);
}

// Function to write to the database
export function writeDB(data: any) {
    // Write the data to the database file, pretty-printing the JSON
    fs.writeFileSync(dbPath, JSON.stringify(data, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }, 2));
}

// Define the User interface
export interface User {
    username: string;
    password: string;
    type: "normal" | "admin";
    candidacy: false | true;
    ether: number;
    votedFor: string | null;
    votesReceived: number;
    pledgedEther: number;
    measure: number;
    userAddress: string | null;
}

// Function to get the user type by username
export function getUserTypeByUsername(username: string): string | null {
    const db = readDB();
    const user = db.users.find((u: User) => u.username === username);
    return user ? user.type : null;
}

// Function to read the winners database
export function readWinnersDB() {
    try {
        const data = fs.readFileSync(winnersDBPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading winnersDB:", error);
        return []; // Return an empty array if there's an error
    }
}

// Function to write to the winners database
export function writeWinnersDB(data: string[]) {
    try {
        // Read the existing winners from the file
        const existingData = readWinnersDB();

        // Filter out any winners that are already in the file
        const uniqueWinners = data.filter(winner => !existingData.includes(winner));

        // If there are any new winners, append them to the existing winners and write back to the file
        if (uniqueWinners.length > 0) {
            const updatedData = [...existingData, ...uniqueWinners];
            fs.writeFileSync(winnersDBPath, JSON.stringify(updatedData, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            }, 2));
        }
    } catch (error) {
        console.error("Error writing to winnersDB:", error);
    }
}