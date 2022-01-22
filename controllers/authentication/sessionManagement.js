import log4js from 'log4js';
import crypto from 'crypto';
import jsonwebtoken from 'jsonwebtoken';
import config from '../../config';
import orm from '../../models/index.model';
import {
  AUTH_SESSION_NO_AUTHENTICATION_METHODS_FOUND,
  GENERIC_ACCOUNT_NOT_FOUND,
  AUTH_RETRO_BAD_PASSWORD,
} from '../../consistency/terms';

const moduleScope = 'AUTH/SESSION';

const logger = log4js.getLogger('default');

const session = {
  userId: 1,
  origination: 'oauth',
  twoFactored: true,
  twoFactorExpires: 0,
};

const sessionMaker = {
  retropilot: {
    username: '',
    password: '',
  },
  oauth: {
    sub: 0,
    email: '',
    expires: 0,
  },
};

export async function validateRetropilotAccount(username, password) {
  const account = await orm.models.accounts.findOne({ where: { email: username } });

  if (!account || !account.dataValues) { return { success: false, ...GENERIC_ACCOUNT_NOT_FOUND }; }

  const inputPassword = crypto.createHash('sha256').update(password + config.applicationSalt).digest('hex');
  if (account.password === inputPassword) {
    return { success: true, authenticated: true, account };
  }
  return { success: true, authenticated: false, ...AUTH_RETRO_BAD_PASSWORD };
}

export async function createSession(session, twoFactorToken) {
  if (session.retropilot && config.v05.authentication.allowPasswordLogin) {
    const isAuthenticated = await validateRetropilotAccount(username, password);

    if (isAuthenticated.success && isAuthenticated.authenticated === true) {
      if (!isAuthenticated.account) {
        logger.warn(moduleScope, `ON PREM AUTHENTICATION SUCCESS YET NO ACCOUNT PASSED FOR ${session.retropilot.username}`);
        return { success: false };
      }
    }
  } else if (session.oauth && config.v05.authentication.oauthEnabled) {

  } else {
    return { success: false, error: true, ...AUTH_SESSION_NO_AUTHENTICATION_METHODS_FOUND };
  }
}

export default '';
