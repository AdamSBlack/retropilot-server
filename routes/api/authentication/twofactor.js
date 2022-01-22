import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { getURL, getToken } from '../../../controllers/authentication/oauth/google';
import authenticationController from '../../../controllers/authentication';
import { AUTH_GENERIC_NOT_AUTHORISED } from '../../../consistency/terms';
import { twoFactorOnboard, twoFactorConfirm } from '../../../controllers/authentication/twofactor';

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

router.get('/authentication/twofactor/enrol', isAuthenticated, async (req, res) => {
  if (!req.account) return res.status(400).json({ success: false, ...AUTH_GENERIC_NOT_AUTHORISED });
  const twoFactor = await twoFactorOnboard(req.account);

  return res.status(200).json(twoFactor);
});

router.get('/authentication/twofactor/verify/:totp', isAuthenticated, async (req, res) => {
  if (!req.account) return res.status(400).json({ success: false, ...AUTH_GENERIC_NOT_AUTHORISED });
  console.log(req.params.totp);

  const twoFactor = await twoFactorConfirm(req.account, req.params.totp);

  return res.status(200).json(twoFactor);
});

export default router;
