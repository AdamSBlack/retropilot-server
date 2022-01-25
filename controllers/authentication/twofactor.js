import log4js from 'log4js';
import { generateSecret, verify } from '2fa-util';
import {
  AUTH_2FA_BAD_ACCOUNT,
  AUTH_2FA_ONBOARD_ALREADY_ENROLLED,
  AUTH_2FA_NOT_ENROLLED,
  AUTH_2FA_ENROLLED,
  AUTH_2FA_BAD_TOKEN,
  AUTH_2FA_NOT_ENABLED,
  AUTH_2FA_BAD_INPUT,
} from '../../consistency/terms';
import orm from '../../models/index.model';
import config from '../../config';

export async function twoFactorOnboard(account) {
  if (!account) { return { success: false, ...AUTH_2FA_BAD_ACCOUNT }; }
  if (account['2fa_token'] !== null) return { success: false, ...AUTH_2FA_ONBOARD_ALREADY_ENROLLED };

  const token = await generateSecret(account.email, config.enterprise.name);

  orm.models.accounts.update(
    { '2fa_token': token.secret },
    { where: { id: account.id } },
  );

  return token;
}

export async function twoFactorConfirm(account, token) {
  if (!account || !token) return { success: false, ...AUTH_2FA_BAD_INPUT };
  if (account.two_factor_enabled) return { success: false, ...AUTH_2FA_ONBOARD_ALREADY_ENROLLED };
  const isTokenValid = await verifyTwoFactor(account, token, true);

  if (isTokenValid) {
    orm.models.accounts.update(
      { two_factor_enabled: true },
      { where: { id: account.id } },
    );
    return {
      success: true,
      ...AUTH_2FA_ENROLLED,
    };
  }
  return {
    success: false,
    ...AUTH_2FA_BAD_TOKEN,
  };
}

export async function verifyTwoFactor(account, token, ignoreIsEnabled) {
  if (!account) { return { success: false, ...AUTH_2FA_BAD_ACCOUNT }; }
  if (account['2fa_token'] === null) return { success: false, ...AUTH_2FA_NOT_ENROLLED };
  if (account.two_factor_enabled !== true
    && !ignoreIsEnabled) { return { success: false, ...AUTH_2FA_NOT_ENABLED }; }

  const result = await verify(token, account['2fa_token']);

  return result;
}

export default null;
