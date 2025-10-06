
import fs, { ReadStream, Stats } from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { EzdError } from '../../models/error/ezd-error';
import { ezdErrorCodes } from '../../models/error/ezd-error-codes';
import { mimeTypes } from '../../lib/mime-types';

export type StaticPlugOpts = {
  dir: string;
  prefix: string;
} & {};

export type StaticPlugUtils = {
  filePathFromUrl: (url: string) => string;
  getFile: (filePath: string) => Promise<Stats | undefined>;
  opts: StaticPlugOpts;
} & {};

const default_mime_type = 'application/octet-stream';

export function staticPlug(
  fastify: FastifyInstance,
  opts: StaticPlugOpts,
  done: (err?: Error) => void
) {
  let staticPlugUtils: StaticPlugUtils;
  staticPlugUtils = getStaticPlugUtils(opts);
  fastify.addHook('onRequest', (req, res, done2) => {
    req.ctx.staticUtils = staticPlugUtils;
    done2();
  });
  fastify.route({
    method: 'GET',
    url: '*',
    handler: staticCtrl,
  });
  done();
}

function getStaticPlugUtils(opts: StaticPlugOpts): StaticPlugUtils {
  let staticPlugUtils: StaticPlugUtils;
  staticPlugUtils = {
    opts: opts,
    filePathFromUrl: filePathFromUrl,
    getFile: getFile,
  };
  return staticPlugUtils;
  function filePathFromUrl(url: string): string {
    let relFilePath: string;
    let filePath: string;
    relFilePath = url.substring(opts.prefix.length);
    filePath = [ opts.dir, relFilePath ].join(path.sep);
    return filePath;
  }
  async function getFile(filePath: string): Promise<Stats | undefined> {
    let fullPath: string;
    let fileExists: boolean;
    let stats: Stats;
    fullPath = [ opts.dir, filePath ].join(path.sep);
    fileExists = fs.existsSync(fullPath);
    if(!fileExists) {
      return undefined;
    }
    stats = await fsp.lstat(fullPath);
    if(!stats.isFile()) {
      return undefined;
    }
    return stats;
  }
}

async function staticCtrl(req: FastifyRequest, res: FastifyReply) {
  if(req.ctx.staticUtils === undefined) {
    throw new EzdError('Missing static utils on ctx', ezdErrorCodes.SERVER_MISSING_CTX_STATIC);
  }
  let relFilePath: string;
  let filePath: string;
  let fileStats: Stats | undefined;
  let contentType: string;
  let rs: ReadStream;
  relFilePath = req.url.substring(req.ctx.staticUtils.opts.prefix.length);
  filePath = req.ctx.staticUtils.filePathFromUrl(req.url);
  console.log({ filePath });
  fileStats = await req.ctx.staticUtils.getFile(relFilePath);
  if(fileStats === undefined) {
    res.callNotFound();
    return res;
  }
  contentType = mimeTypes.getType(relFilePath) ?? default_mime_type;
  rs = fs.createReadStream(filePath);
  res.header('content-type', contentType);
  res.header('content-length', fileStats.size);
  res.status(200).send(rs);
  return res;
}
