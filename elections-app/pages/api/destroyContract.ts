import { NextApiRequest, NextApiResponse } from 'next';
import { web3, electionContract } from '../../web3Config';

const ownerPrivateKey = '0x2fcf329dec56f23cfe59e93f22ee88d32f92abc13362e1592858686c13299dc9';
const ownerAccount = web3.eth.accounts.privateKeyToAccount(ownerPrivateKey);
web3.eth.accounts.wallet.add(ownerAccount);
web3.eth.defaultAccount = ownerAccount.address;

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const txReceipt = await electionContract.methods.destroy().send({
            from: ownerAccount.address,
        });
        res.status(200).json({ success: true, txReceipt });
    } catch (error) {
        const err = error as Error;
        console.error('Error calling selfdestruct:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};