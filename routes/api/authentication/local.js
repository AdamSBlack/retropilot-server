import express from 'express';
import bodyParser from 'body-parser';

import {
  createSession,
} from '../../../controllers/authentication/sessionManagement';

const router = express.Router();

router.post('/', bodyParser.urlencoded({ extended: true }), async (req, res) => {
  const session = await createSession(
    { local: { username: req.body.username, password: req.body.password } },
  );

  if (session.success && session.data) {
    res.cookie('sessionjwt', session.data.jwt);
    return res.json({ success: true, data: { jwt: session.data.jwt } });
  }
  return res.json({ success: false });
});

export default router;
