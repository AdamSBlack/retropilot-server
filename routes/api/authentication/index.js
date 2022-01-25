import express from 'express';

import oauth from './oauth';
import twoFactor from './twofactor';
import local from './local';
import config from '../../../config';

const router = express.Router();

router.use('/twofactor', twoFactor);
router.use('/oauth', oauth);
router.use('/local', local);

export default router;
