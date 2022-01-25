import log4js from 'log4js';
import crypto from 'crypto';
import jsonwebtoken from 'jsonwebtoken';
import config from '../../config';
import orm from '../../models/index.model';
import { verifyTwoFactor } from './twofactor';
import {
  AUTH_SESSION_NO_AUTHENTICATION_METHODS_FOUND,
  GENERIC_ACCOUNT_NOT_FOUND,
  AUTH_RETRO_BAD_PASSWORD,
  AUTH_OAUTH_ERR_NO_ACCOUNT,
} from '../../consistency/terms';
import { getToken } from './oauth/google';
import { getAccountFromEmail, getAccountFromId } from '../users';

const moduleScope = 'AUTH/SESSION';

const logger = log4js.getLogger('default');

/*
concept for auth is all authentication is shipped out to oauth providers,
they'll need to authenticate with a 2FA token to sign in

*/

export async function DANGEROUSMiddlewareSessionNo2FA(req, res, next) {
  const session = await ValidateSession(req.cookies.sessionjwt, false);

  if (session.success === true) {
    if (session.data && session.data.authenticated === true) {
      req.account = session.data.account;
      next();
      return { success: true, authenticated: true, account: session.data.account };
    }
  }
  res.status(400).json({ success: true, msg: 'UNAUTHORISED' });
  return { success: true, authenticated: false, extra: { session } };
}

export async function MiddlewareSessionValidation(req, res, next) {
  const session = await ValidateSession(req.cookies.sessionjwt, true);

  if (session.success === true) {
    if (session.data && session.data.authenticated === true) {
      req.account = session.data.account;
      next();
      return { success: true, authenticated: true, account: session.data.account };
    }
  }

  if (session.twoFactor === false) {
    res.status(400).json({ success: true, msg: 'RENEW 2FA' });
  } else {
    res.status(400).json({ success: true, msg: 'UNAUTHORISED' });
  }
  return { success: true, authenticated: false, extra: { session } };
}

export async function ValidateSession(jwt, twoFactorRequired) {
  let jwtVerified;
  try {
    jwtVerified = jsonwebtoken.verify(jwt, config.applicationSalt);
  } catch (err) {
    logger.error(moduleScope, 'Corrupt JWT', jwt);
    return { success: false, lacking: true };
  }

  if (jwtVerified && jwtVerified.id) {
    if (twoFactorRequired === true
      && (jwtVerified.twoFactorExpires > Date.now() || jwtVerified.twoFactorExpires === null)) {
      return { success: false, twoFactor: false };
    }

    const account = await getAccountFromId(jwtVerified.id);
    if (account && account.dataValues) {
      if (account.banned === true) {
        return { success: true, data: { authenticated: false, banned: true } };
      }

      return { success: true, data: { authenticated: true, account: account.dataValues } };
    }
    return { success: true, data: { authenticated: false, accountExists: false } };
  }

  return { success: false };
}

export async function JWTBuilder(account, twoFactorVerified) {
  // let sessionId = await crypto.randomBytes(528);
  // sessionId = sessionId.toString('hex');

  return jsonwebtoken.sign({
    id: account.id,
    // sessionId,
    twoFactorExpires: twoFactorVerified ? Date.now() + 86400 : null,
  }, config.applicationSalt);
}

export async function addTwoFactorToSession(jwt, twoFactorToken) {
  let jwtVerified;

  try {
    jwtVerified = jsonwebtoken.verify(jwt, config.applicationSalt);
  } catch (err) {
    logger.error(moduleScope, 'Corrupt JWT', jwt);

    return { success: false, lacking: true };
  }

  if (jwtVerified && jwtVerified.id) {
    const account = await getAccountFromId(jwtVerified.id);
    if (account && account.dataValues) {
      const TwoFactorValidation = await verifyTwoFactor(account, twoFactorToken);
      const is2FAValid = TwoFactorValidation === true ? TwoFactorValidation : false;

      if (is2FAValid === true) {
        return {
          success: true,
          data: {
            account,
            jwt: await JWTBuilder(account, is2FAValid),
          },
          extra: { twoFactor: TwoFactorValidation },
        };
      }
      logger.info(moduleScope, `2FA for ${account.id} Invalid`);
      return { success: false, todoaddbadf2fa: true };
    }
    logger.info(moduleScope, `2FA attempted for invalid account (${jwtVerified.id})`, account);

    return { success: false, toDoAddBaddACcount: true };
  }
  logger.info(moduleScope, 'Invalid JWT', jwt);
}

export async function verifyLocalPassword(username, password) {
  const account = await getAccountFromEmail(username);
  console.log('account', account, username);
  if (account) {
    const inputPassword = crypto.createHash('sha256').update(password + config.applicationSalt).digest('hex');
    if (account.password === inputPassword) {
      return { success: true, data: { account } };
    }
    return { success: true, badPasswordFillter: true };
  }
  return { success: false, noaccount: true };
}

// This function exists to create either a local session
// or a oauth session, in order to add 2FA to a session
// you must call addTwoFactorToSession later

export async function createSession(session) {
  if (session.oauth) {
    const oauthSession = await getToken(session.oauth.code, session.oauth.scope);

    const oauthLink = await orm.models.oauth_accounts.findOne(
      { where: { external_id: oauthSession.sub, enabled: true } },
    );

    if (oauthLink && oauthLink.account_id) {
      const account = await getAccountFromId(oauthLink.account_id);
      if (account && account.id === oauthLink.account_id) {
        return {
          success: true,
          data: {
            account,
            jwt: await JWTBuilder(account, false),
          },
        };
      }
    }

    return { success: false, ...AUTH_OAUTH_ERR_NO_ACCOUNT };
  } if (session.local) {
    const localAccount = await verifyLocalPassword(session.local.username, session.local.password);
    console.log(session, localAccount);

    if (localAccount.success === true && localAccount.data) {
      return {
        success: true,
        data: {
          account: localAccount.data.account,
          jwt: await JWTBuilder(localAccount.data.account, false),
        },
      };
    }
  }

  return { success: false };
}

export default '';
