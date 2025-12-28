
import { FastifyInstance, FastifyRequest } from 'fastify';

/*
ordered by precedence high -> low, desc
_*/
const ip_headers = [
  'cf-connecting-ip',
  // 'x-real-ip',
] as const;

export function userInfoPlug(app: FastifyInstance) {
  app.addHook('onRequest', (req, res, done) => {
    let headerIp: string | undefined;
    let reqIp: string;
    headerIp = getHeaderIp(req);
    if(headerIp !== undefined && headerIp !== req.ip) {
      app.log.info({
        headerIp: headerIp,
        requestIp: req.ip,
      }, 'Header ip differs from req.ip');
    }
    reqIp = headerIp ?? req.ip;
    req.session.ip = reqIp;
    done();
  });
}

function getHeaderIp(req: FastifyRequest): string | undefined {
  // ip_headers.some((ipHeader) => {
  //   console.log(`${ipHeader}: ${req.headers[ipHeader]}`);
  // });
  let cfIp = getHeaderStr(req.headers, 'cf-connecting-ip');
  if(cfIp !== undefined) {
    return cfIp;
  }
}

/*
Throws error if an array of strings are found. This is to type-check fastify's req.header
  type, and shouldn't happen at runtime without enabling advanced header parsing.
_*/
function getHeaderStr(headers: FastifyRequest['headers'], key: string): string | undefined {
  let headerVal = headers[key];
  if(headerVal === undefined) {
    return;
  }
  if(Array.isArray(headerVal)) {
    throw new Error(`Multiple values in req.headers[${key}]: ${headerVal.join(', ')}`);
  }
  return headerVal;
}
