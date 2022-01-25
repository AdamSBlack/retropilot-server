import express from 'express';
import { getURL, getToken } from '../../../controllers/authentication/oauth/google';
import authenticationController from '../../../controllers/authentication';
import { AUTH_GENERIC_NOT_AUTHORISED, AUTH_SESSION_NO_AUTHENTICATION_METHODS_FOUND } from '../../../consistency/terms';
import { twoFactorOnboard, twoFactorConfirm, verifyTwoFactor } from '../../../controllers/authentication/twofactor';
import {
  addTwoFactorToSession,
  DANGEROUSMiddlewareSessionNo2FA,
  MiddlewareSessionValidation,
} from '../../../controllers/authentication/sessionManagement';

const router = express.Router();

// Provides 2FA QR Code and secret if not already enrolled

router.get('/enrol', MiddlewareSessionValidation, async (req, res) => {
  if (!req.account) return res.status(400).json({ success: false, ...AUTH_GENERIC_NOT_AUTHORISED });
  const twoFactor = await twoFactorOnboard(req.account);

  return res.status(200).json(twoFactor);
});

// Confirmed TOTP code to enable 2FA

router.get('/enrol/:totp', MiddlewareSessionValidation, async (req, res) => {
  if (!req.account) return res.status(400).json({ success: false, ...AUTH_GENERIC_NOT_AUTHORISED });
  console.log(req.params.totp);

  const twoFactor = await twoFactorConfirm(req.account, req.params.totp);

  return res.status(200).json(twoFactor);
});

// Validate and generate new 2FA session for authentication

router.get('/verify/:totp', MiddlewareSessionValidation, async (req, res) => {
  if (!req.account) return res.status(400).json({ success: false, ...AUTH_GENERIC_NOT_AUTHORISED });
  const session = await addTwoFactorToSession(
    req.cookies.sessionjwt,
    req.params.totp,
  );

  if (session.success && session.data) {
    res.cookie('sessionjwt', session.data.jwt);
    return res.status(200).json({ success: true, data: { jwt: session.data.jwt } });
  }
  return res.status(403).json({ success: false });
});

export default router;
