
import { FastifyReply, FastifyRequest } from 'fastify';

export function getIndexCtrl(req: FastifyRequest, res: FastifyReply) {
  return res.send('¯\\_(ツ)_/¯');
}

