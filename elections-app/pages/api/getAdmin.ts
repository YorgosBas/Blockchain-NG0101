import type { NextApiRequest, NextApiResponse } from 'next';
import { readDB, User } from '../../helpers/db';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const db = readDB();
    const adminUser = db.users.find((user: User) => user.type === 'admin');

    if (!adminUser) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }

    return res.status(200).json({ userAddress: adminUser.userAddress });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};