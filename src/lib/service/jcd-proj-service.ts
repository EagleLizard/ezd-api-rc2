import assert from 'node:assert';
import { gcpDb } from '../client/gcp-db';
import { JcdProject } from '../models/jcd/jcd-project';
import { JcdProjectOrder } from '../models/jcd/jcd-project-order';
import { JcdImage } from '../models/jcd/jcd-image';
import { JcdProjPreview } from '../models/jcd/jcd-proj-preview';

// const do_cache = ezdConfig.USE_JCD_CACHE;
// const jcdCache = JcdCache.init();

/* JCD project service _*/
export const jcdProjService = new class JcdProjService {
  getProjPreviews = getProjPreviews;
  getProjects = getProjects;
  getProjectOrders = getProjectOrders;
  getTitleImages = getTitleImages;
};

async function getProjPreviews(): Promise<JcdProjPreview[]> {
  let [ jcdProjects, jcdProjectOrders, jcdTitleImages ] = await Promise.all([
    jcdProjService.getProjects(),
    jcdProjService.getProjectOrders(),
    jcdProjService.getTitleImages(),
  ]);
  let jcdProjPreviews: JcdProjPreview[] = jcdProjects.map(jcdProj => {
    let foundJcdOrder = jcdProjectOrders.find(jcdOrder => {
      return jcdOrder.projectKey === jcdProj.projectKey;
    });
    assert(foundJcdOrder !== undefined);
    let foundJcdTitleImage = jcdTitleImages.find(jcdImage => {
      return jcdImage.projectKey === jcdProj.projectKey;
    });
    assert(foundJcdTitleImage !== undefined);
    let projPreview: JcdProjPreview = {
      projectKey: jcdProj.projectKey,
      route: jcdProj.route,
      title: jcdProj.title,
      titleUri: foundJcdTitleImage.bucketFile,
      orderIndex: foundJcdOrder.orderIdx,
    };
    return projPreview;
  });
  return jcdProjPreviews;
}

async function getProjects(): Promise<JcdProject[]> {
  let jcdProjects: JcdProject[];
  let query = gcpDb.createQuery('JcdProjectV3');
  let projectsRes = await query.run();
  jcdProjects = projectsRes[0].map(JcdProject.decode);
  return jcdProjects;
}

async function getProjectOrders(): Promise<JcdProjectOrder[]> {
  let query = gcpDb.createQuery('JcdProjectOrderV3');
  let projectOrdersRes = await query.run();
  let jcdProjectOrders = projectOrdersRes[0].map(JcdProjectOrder.decode);
  return jcdProjectOrders;
}

async function getTitleImages(): Promise<JcdImage[]> {
  let query = gcpDb.createQuery('JcdImageV3').filter('imageType', '=', 'TITLE');
  let imageQueryRes = await query.run();
  let jcdImages = imageQueryRes[0].map(JcdImage.decode);
  return jcdImages;
}
