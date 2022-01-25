import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { getURL, getToken } from '../../../controllers/authentication/oauth/google';
import authenticationController from '../../../controllers/authentication';
import {
  createSession,
  addTwoFactorToSession,
  MiddlewareSessionValidation,
  DANGEROUSMiddlewareSessionNo2FA,
} from '../../../controllers/authentication/sessionManagement';
import { AUTH_SESSION_NO_AUTHENTICATION_METHODS_FOUND } from '../../../consistency/terms';

const router = express.Router();

async function isAuthenticated(req, res, next) {
  const account = await authenticationController.getAuthenticatedAccount(req);

  if (account === null) {
    res.json({
      success: true,
      data: {
        authenticated: false,
      },
    });
  } else {
    req.account = account;
    next();
  }
}

router.get('/authentication/twofactor2/:totp', DANGEROUSMiddlewareSessionNo2FA, async (req, res) => {
  console.log(req.cookies.sessionjwt);

  const session = await addTwoFactorToSession(
    req.cookies.sessionjwt,
    req.params.totp,
  );

  if (session.success && session.data) {
    res.cookie('sessionjwt', session.data.jwt);
  }

  res.json(session);
  // res.redirect('http://localhost/authentication/oauth/test');
  // res.json(await getToken(req.query.code, req.query.scope));
});

router.get('/authentication/oauth/callback', async (req, res) => {
  const session = await createSession(
    { oauth: { code: req.query.code, scope: req.query.scope } },
    req.query.state,
  );

  if (session.success && session.data) {
    res.cookie('sessionjwt', session.data.jwt);
  }

  res.json(session);
  // res.redirect('http://localhost/authentication/oauth/test');
  // res.json(await getToken(req.query.code, req.query.scope));
});

router.get('/authentication/oauth/test', isAuthenticated, async (req, res) => {

});

// We shouldn't really be passing 2FA tokens to google

router.get('/authentication/oauth/:provider', async (req, res) => {
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
