const fs = require("fs");
const path = require("path");

// ============================================================================
// Constants
// ============================================================================

const DATA_DIR = __dirname;

/**
 * All valid action categories available in the nekos.best API
 * @constant {string[]}
 */
const VALID_ACTIONS = [
  "angry",
  "baka",
  "bite",
  "blush",
  "bored",
  "cry",
  "cuddle",
  "dance",
  "facepalm",
  "feed",
  "handhold",
  "handshake",
  "happy",
  "highfive",
  "hug",
  "husbando",
  "kick",
  "kiss",
  "kitsune",
  "laugh",
  "lurk",
  "neko",
  "nod",
  "nom",
  "nope",
  "pat",
  "peck",
  "poke",
  "pout",
  "punch",
  "run",
  "shoot",
  "shrug",
  "slap",
  "sleep",
  "smile",
  "smug",
  "stare",
  "think",
  "thumbsup",
  "tickle",
  "waifu",
  "wave",
  "wink",
  "yawn",
  "yeet",
];

/**
 * Categories that return image type (type 1) instead of GIF type (type 2)
 * @constant {Set<string>}
 */
const IMAGE_CATEGORIES = new Set(["husbando", "kitsune", "neko", "waifu"]);

/**
 * Content type constants and mappings
 * @constant {Object}
 */
const CONTENT_TYPES = {
  IMAGE: 1,
  GIF: 2,
  BOTH: 3,
};

const TYPE_ALIASES = {
  1: CONTENT_TYPES.IMAGE,
  2: CONTENT_TYPES.GIF,
  3: CONTENT_TYPES.BOTH,
  image: CONTENT_TYPES.IMAGE,
  images: CONTENT_TYPES.IMAGE,
  gif: CONTENT_TYPES.GIF,
  gifs: CONTENT_TYPES.GIF,
  both: CONTENT_TYPES.BOTH,
};

/**
 * Mode constants and mappings
 * @constant {Object}
 */
const MODES = {
  RANDOM: "random",
  DISTRIBUTED: "distributed",
  EACH: "each",
};

const MODE_ALIASES = {
  1: MODES.RANDOM,
  2: MODES.DISTRIBUTED,
  3: MODES.EACH,
  random: MODES.RANDOM,
  distributed: MODES.DISTRIBUTED,
  each: MODES.EACH,
};

/**
 * Configuration constants
 * @constant {Object}
 */
const CONFIG = {
  MAX_RETRY_ATTEMPTS: 50,
  BASE_URL: "https://nekos.best/api/v2",
};

// ============================================================================
// Intent State Management
// ============================================================================

/**
 * Valid metadata fields for images and gifs
 * @constant {Object}
 */
const METADATA_FIELDS = {
  IMAGE: ["artist_href", "artist_name", "source_url"],
  GIF: ["anime_name"],
};

/**
 * Intent configuration - set once at initialization
 * @private
 */
let intentConfig = {
  active: false,
  metadata: null, // null = all, [] = none, [...fields] = specific fields
  type: CONTENT_TYPES.BOTH,
  allowedCategories: new Set(VALID_ACTIONS),
};

let intentLocked = false;

// ============================================================================
// State Management
// ============================================================================

// Load raw data at module initialization
const dataPath = path.join(DATA_DIR, "data.json");
let rawGifsData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// Active data based on intent (initially full data)
let gifsData = { ...rawGifsData };

// ============================================================================
// Intent Functions
// ============================================================================

/**
 * Configures what data to load in memory (one-time setup)
 * Once set, cannot be changed. Must be called before any other function.
 * @param {Object} options - Intent configuration
 * @param {number|string|Array<string>} [options.metadata] - Metadata to load: 0/false=none, 1/true=all, array=specific fields
 * @param {number|string} [options.type=3] - Content type: 1/'images', 2/'gifs', 3/'both'
 * @throws {Error} If intent already set or invalid parameters
 * @example
 * // Load only anime_name metadata, only GIFs
 * callNekoIntent({
 *   metadata: ["anime_name"],
 *   type: 2
 * });
 *
 * // Load no metadata, only images
 * callNekoIntent({
 *   metadata: 0,
 *   type: 1
 * });
 */
function callNekoIntent(options = {}) {
  if (intentLocked) {
    throw new Error(
      "Intent already configured. callNekoIntent() can only be called once per session."
    );
  }

  const { metadata, type = 3 } = options;

  // Normalize type
  const normalizedType = normalizeType(type);

  // Determine allowed categories based on type
  const allowedCategories = new Set();
  VALID_ACTIONS.forEach((action) => {
    const actionType = getContentType(action);
    if (
      normalizedType === CONTENT_TYPES.BOTH ||
      actionType === normalizedType
    ) {
      allowedCategories.add(action);
    }
  });

  // Normalize metadata parameter
  let metadataFields = null;

  if (metadata === undefined || metadata === null) {
    // Default: load all metadata
    metadataFields = null;
  } else if (metadata === 0 || metadata === false) {
    // Load no metadata
    metadataFields = [];
  } else if (metadata === 1 || metadata === true) {
    // Load all metadata
    metadataFields = null;
  } else if (Array.isArray(metadata)) {
    // Load specific fields, but filter based on type
    const requestedFields = metadata.map((f) => f.trim()).filter((f) => f);

    // Validate that requested fields are valid
    const allValidFields = [...METADATA_FIELDS.IMAGE, ...METADATA_FIELDS.GIF];
    const invalidFields = requestedFields.filter(
      (f) => !allValidFields.includes(f)
    );
    if (invalidFields.length > 0) {
      throw new Error(
        `Invalid metadata fields: ${invalidFields.join(
          ", "
        )}. Valid fields: ${allValidFields.join(", ")}`
      );
    }

    // FIXED: Filter fields based on type - exclude irrelevant metadata
    metadataFields = [];

    if (
      normalizedType === CONTENT_TYPES.GIF ||
      normalizedType === CONTENT_TYPES.BOTH
    ) {
      metadataFields.push(
        ...requestedFields.filter((f) => METADATA_FIELDS.GIF.includes(f))
      );
    }

    if (
      normalizedType === CONTENT_TYPES.IMAGE ||
      normalizedType === CONTENT_TYPES.BOTH
    ) {
      metadataFields.push(
        ...requestedFields.filter((f) => METADATA_FIELDS.IMAGE.includes(f))
      );
    }
  } else {
    throw new Error(
      "metadata must be 0/false (none), 1/true (all), or array of field names"
    );
  }

  // FIXED: When type is IMAGE or GIF only, automatically filter metadata
  if (metadataFields === null) {
    // If loading all metadata but only one type, filter appropriately
    if (normalizedType === CONTENT_TYPES.IMAGE) {
      metadataFields = [...METADATA_FIELDS.IMAGE];
    } else if (normalizedType === CONTENT_TYPES.GIF) {
      metadataFields = [...METADATA_FIELDS.GIF];
    }
    // else BOTH: keep null to load all
  }

  // Update intent configuration and lock it
  intentConfig = {
    active: true,
    metadata: metadataFields,
    type: normalizedType,
    allowedCategories,
  };
  intentLocked = true;

  // Rebuild data based on intent
  gifsData = {};
  for (const category of allowedCategories) {
    gifsData[category] = rawGifsData[category];
  }

  // Free memory from unused categories
  rawGifsData = null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines the content type based on category
 * @private
 * @param {string} category - The category name
 * @returns {number} Content type (1 for images, 2 for GIFs)
 */
function getContentType(category) {
  return IMAGE_CATEGORIES.has(category)
    ? CONTENT_TYPES.IMAGE
    : CONTENT_TYPES.GIF;
}

/**
 * Constructs full URL from filename
 * FIXED: Removed unused category parameter for clarity
 * @private
 * @param {string} filename - The filename (e.g., /angry/uuid.gif)
 * @returns {string} Full URL
 */
function constructFullUrl(filename) {
  return `${CONFIG.BASE_URL}${filename}`;
}

/**
 * Checks if a metadata field should be included based on intent
 * FIXED: Properly filters metadata by content type
 * @private
 * @param {string} field - The metadata field name
 * @param {string} category - The category name
 * @returns {boolean} True if field should be included
 */
function shouldIncludeMetadataField(field, category) {
  // If no intent is active, include all fields
  if (!intentConfig.active) {
    return true;
  }

  // If metadata is null (all for current type), check if field is valid for category type
  if (intentConfig.metadata === null) {
    const categoryType = getContentType(category);
    if (categoryType === CONTENT_TYPES.IMAGE) {
      return METADATA_FIELDS.IMAGE.includes(field);
    } else {
      return METADATA_FIELDS.GIF.includes(field);
    }
  }

  // If metadata is empty array (none), include no fields
  if (intentConfig.metadata.length === 0) {
    return false;
  }

  // Check if field is in the allowed list
  return intentConfig.metadata.includes(field);
}

/**
 * Creates a properly formatted response object with all required fields
 * FIXED: Updated to use corrected constructFullUrl
 * @private
 * @param {Object} item - Raw item data
 * @param {string} category - The category name
 * @returns {Object} Formatted response object
 */
function createResponseObject(item, category) {
  const baseResponse = {
    url: constructFullUrl(item.url),
    action: category,
    type: getContentType(category),
  };

  if (IMAGE_CATEGORIES.has(category)) {
    const imageFields = {};

    if (shouldIncludeMetadataField("artist_href", category)) {
      imageFields.artist_href = item.artist_href;
    }
    if (shouldIncludeMetadataField("artist_name", category)) {
      imageFields.artist_name = item.artist_name;
    }
    if (shouldIncludeMetadataField("source_url", category)) {
      imageFields.source_url = item.source_url;
    }

    return {
      ...baseResponse,
      ...imageFields,
    };
  }

  const gifFields = {};
  if (shouldIncludeMetadataField("anime_name", category)) {
    gifFields.anime_name = item.anime_name;
  }

  return {
    ...baseResponse,
    ...gifFields,
  };
}

/**
 * Validates that requested action is allowed by current intent
 * @private
 * @param {string} action - Action to validate
 * @throws {Error} If action not allowed by intent
 */
function validateIntentAction(action) {
  if (intentConfig.active && !intentConfig.allowedCategories.has(action)) {
    const actionType = getContentType(action);
    const intentTypeStr =
      intentConfig.type === CONTENT_TYPES.IMAGE
        ? "images"
        : intentConfig.type === CONTENT_TYPES.GIF
        ? "GIFs"
        : "both";

    throw new Error(
      `Action "${action}" (type: ${
        actionType === CONTENT_TYPES.IMAGE ? "image" : "gif"
      }) was not specified in intent (type: ${intentTypeStr}). Intent only allows: ${Array.from(
        intentConfig.allowedCategories
      ).join(", ")}`
    );
  }
}

/**
 * Normalizes type parameter to content type number
 * @private
 * @param {*} type - Type parameter (string, number, or undefined)
 * @returns {number} Valid content type
 */
function normalizeType(type) {
  if (type === undefined || type === null) {
    return CONTENT_TYPES.BOTH;
  }

  const normalized = TYPE_ALIASES[type];
  if (normalized !== undefined) {
    return normalized;
  }

  if ([1, 2, 3].includes(type)) {
    return type;
  }

  return CONTENT_TYPES.BOTH;
}

/**
 * Normalizes mode parameter to mode string
 * @private
 * @param {*} mode - Mode parameter (string, number, or undefined)
 * @returns {string} Valid mode string
 */
function normalizeMode(mode) {
  if (mode === undefined || mode === null) {
    return MODES.RANDOM;
  }

  const normalized = MODE_ALIASES[mode];
  if (normalized !== undefined) {
    return normalized;
  }

  if (Object.values(MODES).includes(mode)) {
    return mode;
  }

  return MODES.RANDOM;
}

/**
 * Normalizes actions parameter to array of action strings
 * @private
 * @param {string|string[]|undefined} actions - Actions parameter
 * @returns {string[]} Array of action strings
 */
function normalizeActions(actions) {
  if (actions === undefined || actions === null) {
    // If intent is active, return only allowed categories
    if (intentConfig.active) {
      return Array.from(intentConfig.allowedCategories);
    }
    return [...VALID_ACTIONS];
  }

  const actionArray = Array.isArray(actions) ? actions : [actions];

  const invalidActions = actionArray.filter((a) => !VALID_ACTIONS.includes(a));
  if (invalidActions.length > 0) {
    throw new Error(
      `Invalid actions: ${invalidActions.join(
        ", "
      )}. Valid actions: ${VALID_ACTIONS.join(", ")}`
    );
  }

  // Validate against intent
  actionArray.forEach(validateIntentAction);

  return actionArray;
}

/**
 * Normalizes search parameter to array of search strings
 * @private
 * @param {string|string[]|undefined} search - Search parameter
 * @returns {string[]} Array of search strings (empty array means no filter)
 */
function normalizeSearch(search) {
  if (search === undefined || search === null || search === "") {
    return [];
  }

  const searchArray = Array.isArray(search) ? search : [search];
  return searchArray
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s !== "");
}

/**
 * Checks if a category matches the content type filter
 * @private
 * @param {string} category - The category name
 * @param {number} contentType - The content type filter
 * @returns {boolean} True if category matches content type
 */
function matchesContentType(category, contentType) {
  if (contentType === CONTENT_TYPES.BOTH) return true;

  const itemType = getContentType(category);
  return itemType === contentType;
}

/**
 * Checks if an item matches any of the search criteria
 * @private
 * @param {Object} item - The item to check
 * @param {string} category - The category name
 * @param {string[]} searchTerms - Array of search terms
 * @returns {boolean} True if item matches any search term (or if no search terms)
 */
function matchesSearch(item, category, searchTerms) {
  if (searchTerms.length === 0) return true;

  const searchField = IMAGE_CATEGORIES.has(category)
    ? item.artist_name
    : item.anime_name;

  if (!searchField) return false;

  const fieldLower = searchField.toLowerCase();

  return searchTerms.some((term) => fieldLower.includes(term.toLowerCase()));
}

/**
 * Validates and filters categories by content type
 * @private
 * @param {string[]} categories - Categories to filter
 * @param {number} contentType - Content type filter
 * @returns {string[]} Valid categories
 * @throws {Error} If no categories match content type
 */
function validateAndFilterCategories(categories, contentType) {
  const filtered = categories.filter((cat) =>
    matchesContentType(cat, contentType)
  );

  if (filtered.length === 0) {
    const typeStr =
      contentType === CONTENT_TYPES.IMAGE
        ? "images"
        : contentType === CONTENT_TYPES.GIF
        ? "GIFs"
        : "both";
    throw new Error(
      `No categories match content type filter (${typeStr}). Image categories: ${Array.from(
        IMAGE_CATEGORIES
      ).join(", ")}`
    );
  }

  return filtered;
}

/**
 * Pre-filters all categories by search terms and returns a map of filtered items
 * @private
 * @param {string[]} categories - Categories to filter
 * @param {string[]} searchTerms - Search filter terms
 * @returns {Map<string, Object[]>} Map of category to filtered items
 */
function buildSearchFilteredCategories(categories, searchTerms) {
  const filteredMap = new Map();

  for (const category of categories) {
    const categoryItems = gifsData[category];
    if (!categoryItems) continue;

    const filtered = categoryItems.filter((item) =>
      matchesSearch(item, category, searchTerms)
    );

    if (filtered.length > 0) {
      filteredMap.set(category, filtered);
    }
  }

  return filteredMap;
}

/**
 * Gets random items from pre-filtered items with duplicate control
 * @private
 * @param {Object[]} items - Array of items
 * @param {number} count - Number of items to return
 * @param {string} category - The category name
 * @param {boolean} allowDuplicates - Whether to allow duplicate items
 * @returns {Object[]} Array of selected items
 */
function getRandomItems(items, count, category, allowDuplicates = false) {
  const available = items.length;

  if (available === 0) {
    return [];
  }

  if (!allowDuplicates && count >= available) {
    return items.map((item) => createResponseObject(item, category));
  }

  const result = [];

  if (allowDuplicates) {
    for (let i = 0; i < count; i++) {
      const randomItem = items[Math.floor(Math.random() * available)];
      result.push(createResponseObject(randomItem, category));
    }
  } else {
    const indices = Array.from({ length: available }, (_, i) => i);
    const actualCount = Math.min(count, available);

    for (let i = 0; i < actualCount; i++) {
      const randomIndex = i + Math.floor(Math.random() * (available - i));
      [indices[i], indices[randomIndex]] = [indices[randomIndex], indices[i]];
      result.push(createResponseObject(items[indices[i]], category));
    }
  }

  return result;
}

/**
 * Selects items using random mode (FIXED: searches first, then selects)
 * @private
 */
function selectRandomMode(amount, categories, searchTerms, allowDuplicates) {
  // Build filtered items map first (search priority)
  const filteredMap = buildSearchFilteredCategories(categories, searchTerms);
  const availableCategories = Array.from(filteredMap.keys());

  if (availableCategories.length === 0) {
    return [];
  }

  if (availableCategories.length === 1) {
    const category = availableCategories[0];
    return getRandomItems(
      filteredMap.get(category),
      amount,
      category,
      allowDuplicates
    );
  }

  const result = [];
  const usedUrls = new Set();

  for (let i = 0; i < amount; i++) {
    const randomCategory =
      availableCategories[
        Math.floor(Math.random() * availableCategories.length)
      ];
    const categoryItems = filteredMap.get(randomCategory);

    if (allowDuplicates) {
      const randomItem =
        categoryItems[Math.floor(Math.random() * categoryItems.length)];
      result.push(createResponseObject(randomItem, randomCategory));
    } else {
      let attempts = 0;
      let foundUnique = false;

      while (attempts < CONFIG.MAX_RETRY_ATTEMPTS && !foundUnique) {
        const randomItem =
          categoryItems[Math.floor(Math.random() * categoryItems.length)];
        const url = constructFullUrl(randomItem.url);

        if (!usedUrls.has(url)) {
          result.push(createResponseObject(randomItem, randomCategory));
          usedUrls.add(url);
          foundUnique = true;
        }
        attempts++;
      }

      if (!foundUnique) break;
    }
  }

  return result;
}

/**
 * Selects items using distributed mode (FIXED: searches first)
 * @private
 */
function selectDistributedMode(
  amount,
  categories,
  searchTerms,
  allowDuplicates
) {
  // Build filtered items map first (search priority)
  const filteredMap = buildSearchFilteredCategories(categories, searchTerms);
  const availableCategories = Array.from(filteredMap.keys());

  if (availableCategories.length === 0) {
    return [];
  }

  const result = [];
  const baseAmount = Math.floor(amount / availableCategories.length);
  const remainder = amount % availableCategories.length;

  availableCategories.forEach((cat, index) => {
    const categoryAmount = index < remainder ? baseAmount + 1 : baseAmount;
    const items = getRandomItems(
      filteredMap.get(cat),
      categoryAmount,
      cat,
      allowDuplicates
    );
    result.push(...items);
  });

  return result;
}

/**
 * Selects items using each mode (FIXED: searches first)
 * @private
 */
function selectEachMode(amount, categories, searchTerms, allowDuplicates) {
  // Build filtered items map first (search priority)
  const filteredMap = buildSearchFilteredCategories(categories, searchTerms);
  const availableCategories = Array.from(filteredMap.keys());

  if (availableCategories.length === 0) {
    return [];
  }

  const result = [];

  availableCategories.forEach((cat) => {
    const items = getRandomItems(
      filteredMap.get(cat),
      amount,
      cat,
      allowDuplicates
    );
    result.push(...items);
  });

  return result;
}

/**
 * Parses and validates options object
 * @private
 * @param {Object} options - Options object
 * @returns {Object} Normalized options
 */
function parseOptions(options = {}) {
  const { amount = 1, actions, search, type, mode, dupe = false } = options;

  // Validate amount is a valid number
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1) {
    throw new Error(
      "Amount must be a finite number greater than or equal to 1"
    );
  }

  const normalizedActions = normalizeActions(actions);
  const normalizedSearch = normalizeSearch(search);
  const normalizedType = normalizeType(type);
  const normalizedMode = normalizeMode(mode);

  const validActions = validateAndFilterCategories(
    normalizedActions,
    normalizedType
  );

  return {
    amount: Math.floor(amount),
    actions: validActions,
    search: normalizedSearch,
    type: normalizedType,
    mode: normalizedMode,
    dupe: Boolean(dupe),
  };
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Returns the entire data set with constructed URLs (respects intent)
 * @returns {Object} Object containing all categories with their data and constructed URLs
 * @example
 * const data = callNekoLoad();
 * console.log(data.hug);
 */
function callNekoLoad() {
  const result = {};

  const categoriesToLoad = intentConfig.active
    ? Array.from(intentConfig.allowedCategories)
    : VALID_ACTIONS;

  for (const category of categoriesToLoad) {
    if (gifsData[category]) {
      result[category] = gifsData[category].map((item) =>
        createResponseObject(item, category)
      );
    }
  }

  return result;
}

/**
 * Returns all available action categories (respects intent)
 * @returns {string[]} Array of valid action names
 * @example
 * const actions = callNekoActions();
 * console.log(actions);
 */
function callNekoActions() {
  if (intentConfig.active) {
    return Array.from(intentConfig.allowedCategories);
  }
  return [...VALID_ACTIONS];
}

/**
 * Returns statistics about available content (respects intent)
 * @returns {Object} Statistics object with total count and per-category counts
 * @example
 * const stats = callNekoCount();
 * console.log(stats);
 */
function callNekoCount() {
  const stats = {
    total: 0,
    categories: {},
  };

  const categoriesToCount = intentConfig.active
    ? Array.from(intentConfig.allowedCategories)
    : VALID_ACTIONS;

  categoriesToCount.forEach((action) => {
    if (gifsData[action]) {
      const count = gifsData[action].length;
      stats.categories[action] = count;
      stats.total += count;
    }
  });

  stats.categories = Object.entries(stats.categories)
    .sort(([, a], [, b]) => b - a)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  return stats;
}

/**
 * Fetches nekos.best content based on provided options (respects intent)
 * Priority order: search > type > actions > mode
 * @param {Object} [options] - Configuration object
 * @param {number} [options.amount=1] - Number of items to fetch
 * @param {string|string[]} [options.actions] - Specific action(s) to fetch from
 * @param {string|string[]} [options.search] - Search filter(s) for artist_name or anime_name
 * @param {number|string} [options.type=3] - Content type: 1/'images', 2/'gifs', 3/'both'
 * @param {number|string} [options.mode=1] - Selection mode: 1/'random', 2/'distributed', 3/'each'
 * @param {boolean} [options.dupe=false] - Allow duplicate items
 * @returns {Object|Object[]} Single object or array of objects
 * @throws {Error} If invalid parameters or intent restrictions violated
 * @example
 * const item = callNeko();
 * const hugs = callNeko({ amount: 5, actions: 'hug' });
 */
function callNeko(options = {}) {
  const params = parseOptions(options);

  let result = [];

  switch (params.mode) {
    case MODES.RANDOM:
      result = selectRandomMode(
        params.amount,
        params.actions,
        params.search,
        params.dupe
      );
      break;

    case MODES.DISTRIBUTED:
      result = selectDistributedMode(
        params.amount,
        params.actions,
        params.search,
        params.dupe
      );
      break;

    case MODES.EACH:
      result = selectEachMode(
        params.amount,
        params.actions,
        params.search,
        params.dupe
      );
      break;
  }

  return params.amount === 1 && result.length === 1 ? result[0] : result;
}


// ============================================================================
// Default Export
// ============================================================================

module.exports = {
  callNeko,
  callNekoActions,
  callNekoCount,
  callNekoLoad,
  callNekoIntent,
};
