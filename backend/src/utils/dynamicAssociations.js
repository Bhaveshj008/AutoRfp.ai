// utils/dynamicAssociations.js

const _WIRED = new WeakMap();

function _assocKey(fromModel, toModel, as, type) {
  return `${fromModel.name}::${type}::${as}::${toModel.name}`;
}

function ensureAssociation(
  sequelize,
  {
    from,
    to,
    as,
    type, // 'hasMany' | 'belongsTo' | 'belongsToMany'
    foreignKey,
    sourceKey,
    targetKey,
    through,
    constraints = false,
  }
) {
  if (!sequelize) throw new Error("ensureAssociation: 'sequelize' is required");
  if (!from || !to) throw new Error("ensureAssociation: 'from' and 'to' are required");
  if (!as || !type) throw new Error("ensureAssociation: 'as' and 'type' are required");

  let cache = _WIRED.get(sequelize);
  if (!cache) {
    cache = new Set();
    _WIRED.set(sequelize, cache);
  }

  const key = _assocKey(from, to, as, type);

  if (cache.has(key)) return;
  if (from.associations && from.associations[as]) {
    cache.add(key);
    return;
  }

  switch (type) {
    case "hasMany":
      from.hasMany(to, { as, foreignKey, sourceKey, constraints });
      break;
    case "belongsTo":
      from.belongsTo(to, { as, foreignKey, targetKey, constraints });
      break;
    case "belongsToMany":
      if (!through) throw new Error("belongsToMany requires 'through'");
      from.belongsToMany(to, { as, through, foreignKey, constraints });
      break;
    default:
      throw new Error(`Unsupported association type: ${type}`);
  }

  cache.add(key);
}

function makeDynamicInclude(sequelize, spec, options = {}) {
  ensureAssociation(sequelize, spec);
  const { to, as } = spec;
  return { model: to, as, ...options };
}

function __resetDynamicAssociations(sequelize) {
  if (sequelize) _WIRED.delete(sequelize);
}

module.exports = {
  ensureAssociation,
  makeDynamicInclude,
  __resetDynamicAssociations,
};
