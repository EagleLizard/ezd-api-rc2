
/*
Resolve permissions.

Basic permission scheme for resources:
  CRUD:
    - read
    - write
      - create
      - update
      - delete
  Name scheme:
    resource_id[\.sub_resource_id]+\.op_id
      e.g.:
        user.mgmt
        user.read
  Permission hierarchy:
    .read
    .create
    .update
    .delete
    .write
      implies:
        .create
        .update
        .delete
    .mgmt
      implies:
        .read
        .write
        ALL - match all id.op (?)
_*/

const perm_lvl_enum = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  write: 'write',
  management: 'mgmt',
} as const;
type PermLvl = typeof perm_lvl_enum[keyof typeof perm_lvl_enum];
const perm_lvls: PermLvl[] = Object.values(perm_lvl_enum);

const perm_lvl_map: Partial<Record<PermLvl, PermLvl[]>> = {
  'write': [
    'create',
    'update',
    'delete',
  ],
  'mgmt': [
    'read',
    'write',
  ]
};

export const permUtil = {
  resolve: resolve,
} as const;

function resolve(permStr: string): string[] {
  // get the level id
  let permParts = permStr.split('.');
  let permOp = permParts.pop();
  let itemId = permParts.join('.');
  if(permOp === undefined) {
    // not a permission
    return [];
  }
  if(!isPermLvl(permOp)) {
    return [];
  }
  let resolvedOps = _resolveOp(permOp);
  if(resolvedOps.length === 0) {
    return [ permStr ];
  }
  let resolvedPermStrs: string[] = [];
  for(let i = 0; i < resolvedOps.length; i++) {
    resolvedPermStrs.push(`${itemId}.${resolvedOps[i]}`);
  }
  return resolvedPermStrs;
}
function _resolveOp(op: PermLvl): PermLvl[] {
  let childOps: PermLvl[] = [];
  let currOps: PermLvl[] = perm_lvl_map[op]?.slice() ?? [];
  while(currOps.length > 0) {
    let currOp = currOps.shift()!;
    let currChildOps = perm_lvl_map[currOp]?.slice();
    if(currChildOps === undefined) {
      // leaf-level op
      childOps.push(currOp);
    } else {
      // console.log(currOp);
      // console.log(currChildOps);
      for(let i = 0; i < currChildOps.length; i++) {
        currOps.push(currChildOps[i]);
      }
    }
  }
  return childOps;
}

function isPermLvl(opStr: string): opStr is PermLvl {
  return (perm_lvls as string[]).includes(opStr);
}
