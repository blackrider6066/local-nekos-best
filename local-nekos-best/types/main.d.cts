// ============================================================================
// Type Definitions
// ============================================================================


/**
 * GIF response with anime metadata
 */
interface NekoGif {
  url: string;
  action: string;
  type: 2;
  anime_name?: string;
}


/**
 * Image response with artist metadata
 */
interface NekoImage {
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
type NekoResponse = NekoGif | NekoImage;


/**
 * Statistics response
 */
interface NekoCount {
  total: number;
  categories: { [key: string]: number };
}


/**
 * Content type - can be number or string alias
 */
type ContentType = 1 | 2 | 3 | 'images' | 'gifs' | 'both';


/**
 * Selection modes - can be number or string alias
 */
type NekoMode = 1 | 2 | 3 | 'random' | 'distributed' | 'each';


/**
 * Valid action categories
 */
type NekoAction = 
  | 'angry' | 'baka' | 'bite' | 'blush' | 'bored' | 'cry' | 'cuddle' | 'dance'
  | 'facepalm' | 'feed' | 'handhold' | 'handshake' | 'happy' | 'highfive' | 'hug'
  | 'husbando' | 'kick' | 'kiss' | 'kitsune' | 'laugh' | 'lurk' | 'neko' | 'nod'
  | 'nom' | 'nope' | 'pat' | 'peck' | 'poke' | 'pout' | 'punch' | 'run' | 'shoot'
  | 'shrug' | 'slap' | 'sleep' | 'smile' | 'smug' | 'stare' | 'think' | 'thumbsup'
  | 'tickle' | 'waifu' | 'wave' | 'wink' | 'yawn' | 'yeet';


/**
 * Valid metadata fields
 */
type MetadataField = 'anime_name' | 'artist_href' | 'artist_name' | 'source_url';


/**
 * Metadata configuration for intent
 * - 0 or false: Load no metadata
 * - 1 or true: Load all metadata
 * - Array of fields: Load specific metadata fields
 */
type MetadataIntent = 0 | 1 | boolean | MetadataField[];


/**
 * Configuration options for callNeko function
 */
interface callNekoOptions {
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
interface callNekoIntentOptions {
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
 */
declare function callNekoIntent(options?: callNekoIntentOptions): void;

/**
 * Returns the entire data set with constructed URLs
 */
declare function callNekoLoad(): { [category: string]: NekoResponse[] };

/**
 * Fetches nekos.best content based on provided options
 */
declare function callNeko(options?: callNekoOptions): NekoResponse | NekoResponse[];

/**
 * Returns all available action categories
 */
declare function callNekoActions(): NekoAction[];

/**
 * Returns statistics about available content
 */
declare function callNekoCount(): NekoCount;



// ============================================================================
// CommonJS Export
// ============================================================================

declare namespace LocalNekosBest {
  export {
    NekoGif,
    NekoImage,
    NekoResponse,
    NekoCount,
    ContentType,
    NekoMode,
    NekoAction,
    MetadataField,
    MetadataIntent,
    callNekoOptions,
    callNekoIntentOptions,
  /* Download-related validation types removed */
    callNekoIntent,
    callNekoLoad,
    callNeko,
    callNekoActions,
    callNekoCount,
  };
}

export = LocalNekosBest;
