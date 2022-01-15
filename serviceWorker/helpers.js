import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import log4js from 'log4js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import lockfile from 'proper-lockfile';
import jwt from 'jsonwebtoken';
import dirTree from 'directory-tree';
import { execSync } from 'child_process';
import Reader from '@commaai/log_reader';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';
import config from '../config';

const logger = log4js.getLogger('default');

export function initializeStorage() {
  var verifiedPath = mkDirByPathSync(config.storagePath, { isRelativeToScript: (config.storagePath.indexOf('/') !== 0) });
  if (verifiedPath != null) {
    logger.info(`Verified storage path ${verifiedPath}`);
  } else {
    logger.error(`Unable to verify storage path '${config.storagePath}', check filesystem / permissions`);
    process.exit();
  }
}

export function mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
  const { sep } = path;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep)
    .reduce((parentDir, childDir) => {
      const curDir = path.resolve(baseDir, parentDir, childDir);
      try {
        fs.mkdirSync(curDir);
      } catch (err) {
        if (err.code === 'EEXIST') { // curDir already exists!
          return curDir;
        }

        // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
        if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
          logger.error(`EACCES: permission denied, mkdir '${parentDir}'`);
          return null;
        }

        const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
        if (!caughtErr || (caughtErr && curDir === path.resolve(targetDir))) {
          logger.error('\'EACCES\', \'EPERM\', \'EISDIR\' during mkdir');
          return null;
        }
      }

      return curDir;
    }, initDir);
}

export function writeFileSync(path, buffer, permission) {
  var fileDescriptor;
  try {
    fileDescriptor = fs.openSync(path, 'w', permission);
  } catch (e) {
    fs.chmodSync(path, permission);
    fileDescriptor = fs.openSync(path, 'w', permission);
  }

  if (fileDescriptor) {
    fs.writeSync(fileDescriptor, buffer, 0, buffer.length, 0);
    fs.closeSync(fileDescriptor);
    logger.info(`writeFileSync wiriting to '${path}' successful`);
    return true;
  }
  logger.error(`writeFileSync writing to '${path}' failed`);
  return false;
}

export function moveUploadedFile(buffer, directory, filename) {
  logger.info(`moveUploadedFile called with '${filename}' -> '${directory}'`);

  if (directory.indexOf('..') >= 0 || filename.indexOf('..') >= 0) {
    logger.error('moveUploadedFile failed, .. in directory or filename');
    return false;
  }

  if (config.storagePath.lastIndexOf('/') !== config.storagePath.length - 1) {
    directory = `/${directory}`;
  }
  if (directory.lastIndexOf('/') !== directory.length - 1) directory += '/';

  const finalPath = mkDirByPathSync(config.storagePath + directory, { isRelativeToScript: (config.storagePath.indexOf('/') !== 0) });
  if (finalPath && finalPath.length > 0) {
    if (writeFileSync(`${finalPath}/${filename}`, buffer, 0o660)) {
      logger.info(`moveUploadedFile successfully written '${finalPath}/${filename}'`);
      return `${finalPath}/${filename}`;
    }
    logger.error('moveUploadedFile failed to writeFileSync');
    return false;
  }
  logger.error(`moveUploadedFile invalid final path, check permissions to create / write '${config.storagePath + directory}'`);
  return false;
}

export function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath)
      .forEach((file, index) => {
        const curPath = path.join(directoryPath, file);
        if (fs.lstatSync(curPath)
          .isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
    fs.rmdirSync(directoryPath);
  }
}

export async function dbProtectedRun() {
  let retries = 0;
  while (true) {
    try {
      return await db.run(...arguments);
    } catch (error) {
      logger.error(error);
      retries++;
      if (retries >= 10) {
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  logger.error(`unable to complete dbProtectedRun for ${arguments}`);
  return null;
}

export async function dbProtectedGet() {
  let retries = 0;
  while (true) {
    try {
      return await db.get(...arguments);
    } catch (error) {
      logger.error(error);
      retries++;
      if (retries >= 10) {
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  logger.error(`unable to complete dbProtectedGet for ${arguments}`);
  return null;
}

export async function dbProtectedAll() {
  let retries = 0;
  while (true) {
    try {
      return await db.all(...arguments);
    } catch (error) {
      logger.error(error);
      retries++;
      if (retries >= 10) {
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  logger.error(`unable to complete dbProtectedGet for ${arguments}`);
  return null;
}
