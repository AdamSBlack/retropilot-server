import express from 'express';
import { getURL } from '../../../controllers/authentication/oauth/google';
import {
  createSession,
} from '../../../controllers/authentication/sessionManagement';

const router = express.Router();

router.get('/callback', async (req, res) => {
  const session = await createSession(
    { oauth: { code: req.query.code, scope: req.query.scope } },
    req.query.state,
  );

  if (session.success && session.data) {
    res.cookie('sessionjwt', session.data.jwt);
    return res.json({ success: true, data: { jwt: session.data.jwt } });
  }
  return res.json({ success: false });
});

router.get('/:provider', async (req, res) => {
  const { provider } = req.params;
  let url;
  switch (provider) {
    case 'google':
      url = await getURL();
      break;
    default:
      url = false;
      break;
  }

  if (url) {
    res.redirect(url);
  } else {
    res.json({ error: true, msg: 'Invalid provider' });
  }
});

export default router;
