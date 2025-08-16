
import fs, { ReadStream } from 'node:fs';
import path from 'node:path';
import { FastifyReply, FastifyRequest } from 'fastify';
import { BASE_DIR } from '../lib/constants';

export function getIndexCtrl(req: FastifyRequest, res: FastifyReply) {
  let rs: ReadStream;
  let indexFilePath: string;
  indexFilePath = [ BASE_DIR, 'static', 'index0.html' ].join(path.sep);
  res.header('content-type', 'text/html');
  rs = fs.createReadStream(indexFilePath);
  return res.send(rs);
  // return res.send('¯\\_(ツ)_/¯');
}

