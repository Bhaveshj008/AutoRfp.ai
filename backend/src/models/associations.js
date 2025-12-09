/**
 * Lazy-loading Sequelize model initializer with optional per-model associations.
 *
 * - Models are loaded only when accessed via Proxy.
 * - This supports large-scale, optimized ORM usage with minimal memory and overhead.
 */

const modelDefinitions = {
  Vendors: require("./vendor"),
  Rfps: require("./rfp"),
  RfpVendors: require("./rfpVendor"),
  Emails: require("./email"),
  Proposals: require("./proposal"),
  ProposalItems: require("./proposalItem"),
  RfpItems: require("./rfpItems"),
};
/**


/**
 * Sequelize model loader that returns a Proxy for on-demand model access.
 *
 * @param {Sequelize} sequelize - The Sequelize instance for the DB connection
 * @returns {Proxy} Proxy object exposing initialized models on access
 */
module.exports = (sequelize) => {
  const initializedModels = {};

  /**
   * Initializes and caches a model if not already loaded.
   * Also triggers association queue after every load.
   *
   * @param {string} name - Name of the model to load
   * @returns {Model} Sequelize model instance
   */
  const getModel = (name) => {
    if (!initializedModels[name]) {
      const def = modelDefinitions[name];
      if (!def) throw new Error(` Model "${name}" not found`);

      console.log(`[Sequelize] Initializing model: ${name}`);
      initializedModels[name] = def(sequelize);
    } else {
      console.log(` [Cache] Using cached model: ${name}`);
    }

    return initializedModels[name];
  };

  // Return proxy to lazily load models
  return new Proxy(
    { sequelize },
    {
      get(_, prop) {
        if (prop === "sequelize") return sequelize;
        return getModel(prop);
      },
    }
  );
};

