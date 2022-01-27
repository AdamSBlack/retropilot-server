/* eslint-disable global-require */

import useradmin from './api/retropilot/v0/useradmin';
import api from './api/retropilot/v0/api';
import admin from './administration/adminApi';
import deviceApi from './api/retropilot/v1/devices';
import authentication from './api/authentication/index';
import oauthAuthenticator from './api/authentication/oauth';
import twofactor from './api/authentication/twofactor';

export default {
  useradmin,
  api,
  admin,
  deviceApi,
  oauthAuthenticator,
  twofactor,
  authentication,
};
