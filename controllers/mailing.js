const nodemailer = require('nodemailer');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
let models;
let logger;

const transporter = nodemailer.createTransport(
  {
    host: config.smtp.host,
    port: config.smtp.port,
    auth: {
      user: config.smtp.user,
      password: config.smtp.password,
    },
    logger: true,
    debug: false,
  },
  { from: config.smtp.from },
);

async function sendEmailVerification(token, email) {
  if (!config.smtp.enabled) {
    return logger.warn(`Mailing disabled. ${email} - ${token}`);
  }

  let message,
    error,
    info;

  try {
    message = {
      from: config.smtp.from,
      to: email.trim(),
      subject: 'RetroPilot Registration Token',
      text: `Your Email Registration Token Is: "${token}"`,
    };

    info = await transporter.sendMail(message);
  } catch (exception) {
    error = exception;
  }

  if (error) {
    logger.warn(`Email to ${email} FAILED ${error} - ${token}`);
    return false;
  }

  return info;
}

module.exports = (_models, _logger) => {
  models = _models;
  logger = _logger;

  return {
    sendEmailVerification,
  };
};
