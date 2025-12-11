# Local Nekos Best

A lightweight, zero-dependency library that provides local access to the complete nekos.best API dataset of anime reaction GIFs and images.

## Installation

```bash
npm install local-nekos-best
```

## Quick Start

```js
// ESM
import { callNeko } from 'local-nekos-best';

// Get a random anime reaction
const reaction = callNeko();
console.log(reaction.url);
```

---

## Main Function: callNeko()

Get anime reaction GIFs and images from the local dataset.

### Basic Usage

```js
// Get one random item from any category
const item = callNeko();

// Get 5 random items
const items = callNeko({ amount: 5 });
```

### With Specific Actions

```js
// Get a single hug GIF
const hug = callNeko({ actions: 'hug' });

// Get 3 items from multiple actions
const reactions = callNeko({ 
  amount: 3,
  actions: ['hug', 'pat', 'kiss']
});
```

### Search by Name

```js
// Search for items by anime name (for GIFs) or artist name (for images)
const narutoReactions = callNeko({
  amount: 5,
  search: 'naruto'
});

// Multiple search terms (matches any)
const items = callNeko({
  search: ['naruto', 'one piece']
});
```

### Filter by Type

```js
// Get only images (waifu, husbando, neko, kitsune)
const images = callNeko({ 
  type: 'images'  // or type: 1
});

// Get only GIFs (all other actions)
const gifs = callNeko({ 
  type: 'gifs'  // or type: 2
});

// Get both (default)
const both = callNeko({ 
  type: 'both'  // or type: 3
});
```

### Selection Modes

```js
// Random: Pick randomly from all matching items (default)
const random = callNeko({ 
  amount: 10,
  mode: 'random'  // or mode: 1
});

// Distributed: Split amount evenly across actions
const distributed = callNeko({ 
  amount: 10,
  actions: ['hug', 'pat'],
  mode: 'distributed'  // or mode: 2
  // Returns 5 hugs + 5 pats
});

// Each: Get specified amount from EACH action
const each = callNeko({ 
  amount: 5,
  actions: ['hug', 'pat'],
  mode: 'each'  // or mode: 3
  // Returns 5 hugs + 5 pats = 10 total
});
```

### Allow Duplicates

```js
// By default, duplicates are prevented
const unique = callNeko({ amount: 10 });

// Allow the same item multiple times
const withDupes = callNeko({ 
  amount: 10,
  dupe: true 
});
```

### All Options

```js
callNeko({
  amount: 1,           // Number of items (default: 1)
  actions: ['hug'],    // String or array of actions
  search: 'naruto',    // String or array of search terms
  type: 'both',        // 'images', 'gifs', 'both' (or 1, 2, 3)
  mode: 'random',      // 'random', 'distributed', 'each' (or 1, 2, 3)
  dupe: false          // Allow duplicates (default: false)
})
```

### Response Format

```js
// Single item (when amount = 1)
const item = callNeko({ actions: 'hug' });
console.log(item);
// Output:
{
  url: "https://nekos.best/api/v2/hug/abc123.gif",
  action: "hug",
  type: 2,              // 1 = image, 2 = gif
  anime_name: "Naruto"  // For GIFs (if metadata loaded)
}

// Image example
const image = callNeko({ actions: 'waifu' });
console.log(image);
// Output:
{
  url: "https://nekos.best/api/v2/waifu/def456.png",
  action: "waifu",
  type: 1,
  artist_name: "Artist Name",      // For images (if metadata loaded)
  artist_href: "https://twitter.com/artist",
  source_url: "https://pixiv.net/..."
}

// Multiple items (when amount > 1)
const items = callNeko({ amount: 2, actions: 'hug' });
console.log(items);
// Output:
[
  { url: "https://nekos.best/api/v2/hug/abc123.gif", action: "hug", type: 2, anime_name: "Naruto" },
  { url: "https://nekos.best/api/v2/hug/xyz789.gif", action: "hug", type: 2, anime_name: "One Piece" }
]
```

---

## Recommended: callNekoIntent()

**Call this FIRST** to optimize memory usage by loading only what you need.

### Why Use Intent?

- **Saves Memory**: Load only the data you'll actually use
- **One-Time Setup**: Configure once, affects all future calls
- **Cannot be Changed**: Once set, it's locked for the session

### Loading Metadata

```js
// Load all metadata (default if not specified)
callNekoIntent({ metadata: 1 });
// or
callNekoIntent({ metadata: true });

// Load no metadata (smallest memory footprint)
callNekoIntent({ metadata: 0 });
// or
callNekoIntent({ metadata: false });

// Load specific metadata fields
callNekoIntent({ 
  metadata: ["anime_name"]  // Only load anime names
});

callNekoIntent({ 
  metadata: ["artist_name", "artist_href", "source_url"]
});
```

**Available Metadata Fields:**
- For GIFs: `"anime_name"`
- For Images: `"artist_name"`, `"artist_href"`, `"source_url"`

### Loading by Type

```js
// Load only images (waifu, husbando, neko, kitsune)
callNekoIntent({ type: 'images' });  // or type: 1

// Load only GIFs (all other actions)
callNekoIntent({ type: 'gifs' });    // or type: 2

// Load both (default)
callNekoIntent({ type: 'both' });    // or type: 3
```

### Combined Example

```js
// Only load GIFs with anime names
callNekoIntent({
  metadata: ["anime_name"],
  type: "gifs"
});

// Now all callNeko() calls only work with GIFs
const gif = callNeko({ actions: 'hug' });  // ✓ Works
const img = callNeko({ actions: 'waifu' }); // ✗ Error - images not loaded
```

### Important Notes

- **Call before any other function**
- **Can only be called once** per session
- **Automatically filters metadata** based on type (e.g., if you load only GIFs, image metadata is excluded even if you request it)
- **Affects all functions** (callNeko, callNekoLoad, callNekoActions, callNekoCount)

---

## Extra Functions

### callNekoActions()

Get all available action categories.

```js
const actions = callNekoActions();
console.log(actions);
// Output: ['angry', 'baka', 'bite', 'blush', 'bored', 'cry', 'cuddle', 'dance', ...]
```

**Respects Intent:**
```js
callNekoIntent({ type: 'images' });
const actions = callNekoActions();
console.log(actions);
// Output: ['husbando', 'kitsune', 'neko', 'waifu']
```

---

### callNekoCount()

Get statistics about available content.

```js
const stats = callNekoCount();
console.log(stats);
// Output:
{
  total: 3500,
  categories: {
    neko: 1500,
    pat: 500,
    hug: 40,
    waifu: 200,
    // ... sorted by count (highest first)
  }
}
```

---

### callNekoLoad()

Get the entire dataset with constructed URLs. Useful for caching or custom filtering.

```js
const data = callNekoLoad();
console.log(Object.keys(data));
// Output: ['angry', 'baka', 'bite', ...]

console.log(data.hug[0]);
// Output:
{
  url: "https://nekos.best/api/v2/hug/abc123.gif",
  action: "hug",
  type: 2,
  anime_name: "Naruto"
}
```

**Respects Intent** — only returns loaded categories.

---

## TypeScript Support

Full TypeScript definitions included. Types are automatically available when imported.

```typescript
import { callNeko, NekoResponse, NekoAction } from 'local-nekos-best';

const result: NekoResponse = callNeko({ actions: 'hug' });
```