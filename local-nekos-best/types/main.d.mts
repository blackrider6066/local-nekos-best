// ============================================================================
// Type Definitions
// ============================================================================

/**
 * GIF response with anime metadata
 */
export interface NekoGif {
  url: string;
  action: string;
  type: 2;
  anime_name?: string;
}

/**
 * Image response with artist metadata
 */
export interface NekoImage {
  url: string;
  action: string;
  type: 1;
  artist_href?: string;
  artist_name?: string;
  source_url?: string;
}

/**
 * Union type for any neko response
 */
export type NekoResponse = NekoGif | NekoImage;

/**
 * Statistics response
 */
export interface NekoCount {
  total: number;
  categories: { [key: string]: number };
}

/**
 * Content type - can be number or string alias
 */
export type ContentType = 1 | 2 | 3 | 'images' | 'gifs' | 'both';

/**
 * Selection modes - can be number or string alias
 */
export type NekoMode = 1 | 2 | 3 | 'random' | 'distributed' | 'each';

/**
 * Valid action categories
 */
export type NekoAction = 
  | 'angry' | 'baka' | 'bite' | 'blush' | 'bored' | 'cry' | 'cuddle' | 'dance'
  | 'facepalm' | 'feed' | 'handhold' | 'handshake' | 'happy' | 'highfive' | 'hug'
  | 'husbando' | 'kick' | 'kiss' | 'kitsune' | 'laugh' | 'lurk' | 'neko' | 'nod'
  | 'nom' | 'nope' | 'pat' | 'peck' | 'poke' | 'pout' | 'punch' | 'run' | 'shoot'
  | 'shrug' | 'slap' | 'sleep' | 'smile' | 'smug' | 'stare' | 'think' | 'thumbsup'
  | 'tickle' | 'waifu' | 'wave' | 'wink' | 'yawn' | 'yeet';

/**
 * Valid metadata fields
 */
export type MetadataField = 'anime_name' | 'artist_href' | 'artist_name' | 'source_url';

/**
 * Metadata configuration for intent
 * - 0 or false: Load no metadata
 * - 1 or true: Load all metadata
 * - Array of fields: Load specific metadata fields
 */
export type MetadataIntent = 0 | 1 | boolean | MetadataField[];

/**
 * Configuration options for callNeko function
 */
export interface callNekoOptions {
  /**
   * Number of items to fetch (must be >= 1)
   * @default 1
   */
  amount?: number;

  /**
   * Specific action(s) to fetch from
   * @default All actions (or all actions allowed by intent)
   */
  actions?: NekoAction | NekoAction[];

  /**
   * Search filter(s) for artist_name (images) or anime_name (GIFs)
   * Multiple search terms use OR logic
   * @default No filter
   */
  search?: string | string[];

  /**
   * Content type filter
   * - 1 or 'image'/'images': Only images (husbando, kitsune, neko, waifu)
   * - 2 or 'gif'/'gifs': Only GIFs
   * - 3 or 'both': Both images and GIFs
   * @default 3 (both)
   */
  type?: ContentType;

  /**
   * Selection mode
   * - 1 or 'random': Randomly select from all matching categories
   * - 2 or 'distributed': Distribute amount evenly across categories
   * - 3 or 'each': Get amount items from each category
   * @default 1 (random)
   */
  mode?: NekoMode;

  /**
   * Allow duplicate items in results
   * @default false
   */
  dupe?: boolean;
}

/**
 * Configuration options for callNekoIntent function
 */
export interface callNekoIntentOptions {
  /**
   * Metadata fields to load in memory
   * - 0 or false: Load no metadata (only url, action, type)
   * - 1 or true: Load all metadata fields
   * - Array: Load specific metadata fields
   * 
   * Note: Fields are filtered based on type parameter
   * - GIF-only type will ignore image metadata fields (artist_href, artist_name, source_url)
   * - Image-only type will ignore GIF metadata fields (anime_name)
   * 
   * @default undefined (load all metadata)
   */
  metadata?: MetadataIntent;

  /**
   * Content type to load in memory
   * - 1 or 'image'/'images': Only load images
   * - 2 or 'gif'/'gifs': Only load GIFs
   * - 3 or 'both': Load both types
   * 
   * @default 3 (both)
   */
  type?: ContentType;
}

// ============================================================================
// Function Signatures
// ============================================================================

/**
 * Configures what data to load in memory (one-time setup)
 * 
 * This function can only be called ONCE per session and cannot be changed afterward.
 * It restricts what data is loaded into memory, similar to Discord Gateway Intents.
 * 
 * **Important:**
 * - Must be called before any other function if you want to restrict data
 * - Once called, it cannot be reset or changed
 * - All subsequent function calls will respect the intent configuration
 * - Attempting to use actions/metadata not specified in intent will throw errors
 * 
 * @param options - Intent configuration object
 * @throws Error if intent already configured or invalid parameters provided
 * 
 * @example
 * ```typescript
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
 * 
 * // Load all metadata for both types (default behavior)
 * callNekoIntent({
 *   metadata: 1,
 *   type: 3
 * });
 * 
 * // Note: If you request artist_name but type is 2 (GIFs),
 * // artist_name won't be loaded since it's only for images
 * callNekoIntent({
 *   metadata: ["artist_name", "anime_name"],
 *   type: 2  // Only anime_name will be loaded
 * });
 * ```
 */
export function callNekoIntent(options?: callNekoIntentOptions): void;

/**
 * Returns the entire data set with constructed URLs
 * Respects intent configuration if set.
 * 
 * @returns Object containing all categories with their data and constructed URLs
 * 
 * @example
 * ```typescript
 * const data = callNekoLoad();
 * console.log(data.hug); // Array of hug items with constructed URLs
 * ```
 */
export function callNekoLoad(): { [category: string]: NekoResponse[] };

/**
 * Fetches nekos.best content based on provided options
 * Respects intent configuration if set.
 * 
 * @param options - Configuration object
 * @returns Single object (if amount=1) or array of objects
 * @throws Error if trying to use actions/metadata not specified in intent
 * 
 * @example
 * ```typescript
 * // Get one random item from all categories
 * const item = callNeko();
 * 
 * // Get 5 random hugs
 * const hugs = callNeko({ amount: 5, actions: 'hug' });
 * 
 * // Multiple actions with search
 * const items = callNeko({
 *   amount: 10,
 *   actions: ['hug', 'pat', 'kiss'],
 *   search: 'naruto',
 *   mode: 'distributed'
 * });
 * 
 * // Multiple search terms (OR logic)
 * const filtered = callNeko({
 *   amount: 20,
 *   search: ['naruto', 'jujutsukaisen'],
 *   actions: 'hug'
 * });
 * 
 * // Only GIFs with duplicates allowed
 * const gifs = callNeko({
 *   amount: 100,
 *   type: 'gif',
 *   dupe: true
 * });
 * 
 * // Using numeric aliases
 * const result = callNeko({
 *   amount: 5,
 *   actions: 'hug',
 *   type: 2,      // GIFs
 *   mode: 3       // Each mode
 * });
 * ```
 */
export function callNeko(options?: callNekoOptions): NekoResponse | NekoResponse[];

/**
 * Returns all available action categories
 * Respects intent configuration if set.
 * 
 * @returns Array of all valid action names (filtered by intent if configured)
 * 
 * @example
 * ```typescript
 * const actions = callNekoActions();
 * console.log(actions); // ['angry', 'baka', 'bite', ...]
 * ```
 */
export function callNekoActions(): NekoAction[];

/**
 * Returns statistics about available content
 * Respects intent configuration if set.
 * 
 * @returns Statistics with total count and per-category counts
 * 
 * @example
 * ```typescript
 * const stats = callNekoCount();
 * console.log(stats.total);              // Total number of items
 * console.log(stats.categories.hug);     // Number of hug items
 * ```
 */
export function callNekoCount(): NekoCount;


// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  callNeko: typeof callNeko;
  callNekoActions: typeof callNekoActions;
  callNekoCount: typeof callNekoCount;
  callNekoLoad: typeof callNekoLoad;
  callNekoIntent: typeof callNekoIntent;
};

export default _default;