import { NextApiRequest, NextApiResponse } from 'next';
import { web3, electionContract } from '../../web3Config';

const ownerPrivateKey = '0x20ea317be40d117d5e423253c59524fefb9a472db8a525de96019eafb297368b';
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