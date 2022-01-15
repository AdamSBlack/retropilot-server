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
import config from '../../config';
import { dbProtectedAll } from '../helpers';

var logger = log4js.getLogger('default');

export default async function deleteBootAndCrashLogs() {
  const devices = await dbProtectedAll('SELECT * FROM devices');
  if (devices == null) {
    return;
  }

  for (let t = 0; t < devices.length; t++) {
    const device = devices[t];
    const dongleIdHash = crypto.createHmac('sha256', config.applicationSalt)
      .update(device.dongle_id)
      .digest('hex');

    const bootlogDirectoryTree = dirTree(`${config.storagePath + device.dongle_id}/${dongleIdHash}/boot/`, { attributes: ['size'] });
    const bootlogFiles = [];
    if (bootlogDirectoryTree != undefined) {
      for (let i = 0; i < bootlogDirectoryTree.children.length; i++) {
        const timeSplit = bootlogDirectoryTree.children[i].name.replace('boot-', '')
          .replace('crash-', '')
          .replace('\.bz2', '')
          .split('--');
        const timeString = `${timeSplit[0]} ${timeSplit[1].replace(/-/g, ':')}`;
        bootlogFiles.push({
          name: bootlogDirectoryTree.children[i].name,
          size: bootlogDirectoryTree.children[i].size,
          date: Date.parse(timeString),
          path: bootlogDirectoryTree.children[i].path,
        });
      }
      bootlogFiles.sort((a, b) => ((a.date < b.date) ? 1 : -1));
      for (let c = 5; c < bootlogFiles.length; c++) {
        logger.info(`deleteBootAndCrashLogs deleting boot log ${bootlogFiles[c].path}`);
        try {
          fs.unlinkSync(bootlogFiles[c].path);
          // affectedDevices[device.dongle_id] = true;
        } catch (exception) {
          logger.error(exception);
        }
      }
    }

    const crashlogDirectoryTree = dirTree(`${config.storagePath + device.dongle_id}/${dongleIdHash}/crash/`, { attributes: ['size'] });
    const crashlogFiles = [];
    if (crashlogDirectoryTree !== undefined) {
      for (let i = 0; i < crashlogDirectoryTree.children.length; i++) {
        const timeSplit = crashlogDirectoryTree.children[i].name.replace('boot-', '')
          .replace('crash-', '')
          .replace('\.bz2', '')
          .split('--');
        const timeString = `${timeSplit[0]} ${timeSplit[1].replace(/-/g, ':')}`;
        crashlogFiles.push({
          name: crashlogDirectoryTree.children[i].name,
          size: crashlogDirectoryTree.children[i].size,
          date: Date.parse(timeString),
          path: crashlogDirectoryTree.children[i].path,
        });
      }
      crashlogFiles.sort((a, b) => ((a.date < b.date) ? 1 : -1));
      for (let c = 5; c < crashlogFiles.length; c++) {
        logger.info(`deleteBootAndCrashLogs deleting crash log ${crashlogFiles[c].path}`);
        try {
          fs.unlinkSync(crashlogFiles[c].path);
          // affectedDevices[device.dongle_id] = true;
        } catch (exception) {
          logger.error(exception);
        }
      }
    }
  }
}
