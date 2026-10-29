
import { FastifySchema } from 'fastify';
import Type from 'typebox';
import { JobDto } from '../../lib/models/job/job-dto';
import { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { perm } from '../../lib/service/perm-service';
import { jobService } from '../../lib/service/job-service';

const GetJob = {
  querystring: Type.Object({
    id: Type.Number(),
  }),
  response: {
    200: JobDto.schema,
    403: Type.Object({ errMsg: Type.String() }),
    404: Type.Any(),
  }
} as const satisfies FastifySchema;
type GetJob = typeof GetJob;
async function getJob(req: ReqTB<GetJob>, res: RepTB<GetJob>) {
  let ctxUser = req.ctx.getUser();
  let hasPerm = await perm.check(ctxUser.user_id, 'job.mgmt');
  if(!hasPerm) {
    return res.status(403).send({ errMsg: 'Permission denied' });
  }
  let jobDto = await jobService.getJob(req.query.id);
  if(jobDto === undefined) {
    return res.status(404).send();
  }
  return res.status(200).send(jobDto);
}

export const JobCtrl = {
  GetJob: GetJob,
  getJob: getJob,
} as const;
