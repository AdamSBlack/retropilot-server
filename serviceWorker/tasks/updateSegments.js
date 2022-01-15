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

export default async function updateSegments() {
  const segmentProcessQueue = [];
  const affectedDrives = {};

  const drive_segments = await dbProtectedAll('SELECT * FROM drive_segments WHERE upload_complete = ? AND is_stalled = ? AND process_attempts < ? ORDER BY created ASC', false, false, 4);
  if (drive_segments != null) {
    for (let t = 0; t < drive_segments.length; t++) {
      const segment = drive_segments[t];

      const dongleIdHash = crypto.createHmac('sha256', config.applicationSalt)
        .update(segment.dongle_id)
        .digest('hex');
      const driveIdentifierHash = crypto.createHmac('sha256', config.applicationSalt)
        .update(segment.drive_identifier)
        .digest('hex');

      const directoryTree = dirTree(`${config.storagePath + segment.dongle_id}/${dongleIdHash}/${driveIdentifierHash}/${segment.drive_identifier}/${segment.segment_id}`);
      if (directoryTree == null || directoryTree.children == undefined) continue; // happens if upload in progress (db entity written but directory not yet created)

      const qcamera = false;
      const fcamera = false;
      const dcamera = false;
      const qlog = false;
      const rlog = false;
      const fileStatus = {
        'fcamera.hevc': false,
        'dcamera.hevc': false,
        'qcamera.ts': false,
        'qlog.bz2': false,
        'rlog.bz2': false,
      };

      for (const i in directoryTree.children) {
        fileStatus[directoryTree.children[i].name] = directoryTree.children[i].path;
      }

      var uploadComplete = false;
      if (fileStatus['qcamera.ts'] !== false && fileStatus['fcamera.hevc'] !== false && fileStatus['rlog.bz2'] !== false && fileStatus['qlog.bz2'] !== false) // upload complete
      {
        uploadComplete = true;
      }

      if (fileStatus['qcamera.ts'] !== false && fileStatus['rlog.bz2'] !== false && !segment.is_processed) { // can process
        segmentProcessQueue.push({
          segment,
          fileStatus,
          uploadComplete,
          driveIdentifier: `${segment.dongle_id}|${segment.drive_identifier}`,
        });
      } else if (uploadComplete) {
        logger.info(`updateSegments uploadComplete for ${segment.dongle_id} ${segment.drive_identifier} ${segment.segment_id}`);

        const driveSegmentResult = await dbProtectedRun(
          'UPDATE drive_segments SET upload_complete = ?, is_stalled = ? WHERE id = ?',
          true,

          false,

          segment.id,
        );

        affectedDrives[`${segment.dongle_id}|${segment.drive_identifier}`] = true;
      } else if (Date.now() - segment.created > 10 * 24 * 3600 * 1000) { // ignore non-uploaded segments after 10 days until a new upload_url is requested (which resets is_stalled)
        logger.info(`updateSegments isStalled for ${segment.dongle_id} ${segment.drive_identifier} ${segment.segment_id}`);

        const driveSegmentResult = await dbProtectedRun(
          'UPDATE drive_segments SET is_stalled = ? WHERE id = ?',
          true,

          segment.id,
        );
      }

      if (segmentProcessQueue.length >= 15) { // we process at most 15 segments per batch
        break;
      }
    }
  }

  if (segmentProcessQueue.length > 0) {
    processSegmentsRecursive();
  } else // if no data is to be collected, call updateDrives to update those where eventually just the last segment completed the upload
  {
    updateDrives();
  }
}
