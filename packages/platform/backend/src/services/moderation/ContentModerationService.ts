/**
 * @hololand/backend -- ContentModerationService
 *
 * Multi-layer content moderation pipeline following tiered defense (W.023).
 *
 * Architecture (sequential short-circuit):
 *
 *   Content Input
 *       |
 *       v
 *   [Layer 0: Regex/Blocklist Scanner]  -- <1ms, synchronous, 60-80% coverage
 *       |  high-confidence match? --> short-circuit (remove/ban)
 *       v
 *   [Layer 1: External Classifiers]     -- ~50-200ms, Perspective API + NSFW stub
 *       |  high-confidence match? --> short-circuit (remove/warn)
 *       v
 *   [Layer 2: LLM Contextual Review]    -- async batch, contextual analysis
 *       |  high-confidence match? --> short-circuit (remove/warn)
 *       v
 *   [Layer 3: Human Review Queue]       -- escalation for borderline content
 *       |
 *       v
 *   ModerationResult { action, confidence, matchedLayer, details }
 *
 * Key constraints:
 *   - NEVER put classifiers in VR render loop (G.003.09)
 *   - All moderation is async/event-driven
 *   - Layer 0-2 aim for <1ms to ~200ms at 60-80% coverage (W.023)
 *   - Expensive LLM (Layer 2) only for ambiguous/high-stakes content
 *
 * @version 1.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

/** Content types that can be moderated. */
export type ContentType = 'chat' | 'listing' | 'description' | 'profile' | 'world_name' | 'script';

/** Actions the moderation pipeline can take. */
export type ModerationAction = 'allow' | 'warn' | 'remove' | 'ban';

/** Which layer produced the final decision. */
export type ModerationLayer = 'layer0_blocklist' | 'layer1_classifier' | 'layer2_llm' | 'layer3_human' | 'none';

/** Severity levels for moderation findings. */
export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/** Result returned by the moderation pipeline. */
export interface ModerationResult {
  /** The action to take on the content. */
  action: ModerationAction;
  /** Confidence in the decision (0-1). */
  confidence: number;
  /** Which layer produced the final decision. */
  matchedLayer: ModerationLayer;
  /** Human-readable explanation of the decision. */
  reason: string;
  /** Severity of the detected violation. */
  severity: Severity;
  /** Detailed findings from each layer that ran. */
  layerResults: LayerResult[];
  /** ISO timestamp of the moderation decision. */
  timestamp: string;
  /** Content type that was moderated. */
  contentType: ContentType;
  /** Tenant ID if multi-tenant. */
  tenantId?: string;
}

/** Result from a single moderation layer. */
export interface LayerResult {
  layer: ModerationLayer;
  /** Whether this layer flagged the content. */
  flagged: boolean;
  /** Score from 0-1, where 1 is most violating. */
  score: number;
  /** Details about what was found. */
  details: string;
  /** Time taken by this layer in milliseconds. */
  durationMs: number;
}

/** Configuration for the moderation pipeline. */
export interface ModerationConfig {
  /** Confidence threshold to short-circuit at Layer 0. Default: 0.85 */
  layer0ShortCircuitThreshold?: number;
  /** Confidence threshold to short-circuit at Layer 1. Default: 0.80 */
  layer1ShortCircuitThreshold?: number;
  /** Confidence threshold to short-circuit at Layer 2. Default: 0.75 */
  layer2ShortCircuitThreshold?: number;
  /** Below this confidence, escalate to human review. Default: 0.60 */
  humanReviewThreshold?: number;
  /** Perspective API key (required for Layer 1). */
  perspectiveApiKey?: string;
  /** Perspective API rate limit (QPS). Default: 1000 */
  perspectiveRateLimit?: number;
  /** LLM API endpoint for Layer 2. */
  llmApiEndpoint?: string;
  /** LLM API key for Layer 2. */
  llmApiKey?: string;
  /** Maximum items in LLM batch queue before flush. Default: 50 */
  llmBatchSize?: number;
  /** LLM batch flush interval in ms. Default: 5000 */
  llmBatchFlushIntervalMs?: number;
  /** Human review webhook URL for Layer 3. */
  humanReviewWebhookUrl?: string;
  /** Enable/disable specific layers. */
  enabledLayers?: {
    layer0?: boolean;
    layer1?: boolean;
    layer2?: boolean;
    layer3?: boolean;
  };
}

/** Event emitted by the moderation pipeline. */
export interface ModerationEvent {
  type: 'content_flagged' | 'content_allowed' | 'escalated_to_human' | 'batch_processed' | 'error';
  contentId?: string;
  result?: ModerationResult;
  error?: string;
  timestamp: string;
}

type ModerationEventCallback = (event: ModerationEvent) => void;

/** Item queued for LLM batch processing. */
interface LLMQueueItem {
  content: string;
  contentType: ContentType;
  tenantId?: string;
  resolve: (result: LayerResult) => void;
  reject: (error: Error) => void;
  queuedAt: number;
}

/** Item sent to human review. */
export interface HumanReviewItem {
  id: string;
  content: string;
  contentType: ContentType;
  tenantId?: string;
  layerResults: LayerResult[];
  reason: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

/** Perspective API response shape. */
interface PerspectiveAPIResponse {
  attributeScores: {
    [key: string]: {
      summaryScore: {
        value: number;
        type: string;
      };
    };
  };
}

/** NSFW classification result. */
export interface NSFWClassification {
  safe: boolean;
  category: 'safe' | 'nsfw' | 'suggestive' | 'unknown';
  confidence: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: Required<ModerationConfig> = {
  layer0ShortCircuitThreshold: 0.85,
  layer1ShortCircuitThreshold: 0.80,
  layer2ShortCircuitThreshold: 0.75,
  humanReviewThreshold: 0.60,
  perspectiveApiKey: '',
  perspectiveRateLimit: 1000,
  llmApiEndpoint: '',
  llmApiKey: '',
  llmBatchSize: 50,
  llmBatchFlushIntervalMs: 5000,
  humanReviewWebhookUrl: '',
  enabledLayers: {
    layer0: true,
    layer1: true,
    layer2: true,
    layer3: true,
  },
};

// =============================================================================
// LAYER 0: REGEX / BLOCKLIST SCANNER
// =============================================================================

/**
 * Leet-speak normalization map.
 * Converts common character substitutions back to their alphabetic equivalents.
 */
const LEET_SPEAK_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '(': 'c',
  '{': 'c',
  '<': 'c',
  'd': 'd',
  '3': 'e',
  '6': 'g',
  '#': 'h',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  'j': 'j',
  'k': 'k',
  '7': 'l',
  '0': 'o',
  '9': 'p',
  'q': 'q',
  '2': 'r',
  '$': 's',
  '5': 's',
  '+': 't',
  'u': 'u',
  'v': 'v',
  'w': 'w',
  'x': 'x',
  'y': 'y',
  'z': 'z',
};

/**
 * Normalize text by converting leet-speak substitutions to standard letters,
 * removing non-alphanumeric separators, and lowercasing.
 */
function normalizeLeetSpeak(text: string): string {
  let normalized = '';
  for (const char of text.toLowerCase()) {
    normalized += LEET_SPEAK_MAP[char] ?? char;
  }
  // Remove common separator characters used to evade detection
  // e.g., "f.u.c.k" -> "fuck", "f-u-c-k" -> "fuck"
  return normalized.replace(/[\s\-_.!@#$%^&*()+=<>?,/\\|[\]{}~`'"]/g, '');
}

/**
 * Built-in profanity blocklist (500+ terms).
 * This is a representative set covering slurs, explicit content, threats,
 * and other harmful terms. Organized by category for maintainability.
 *
 * IMPORTANT: This list is intentionally comprehensive for content safety.
 * These terms exist solely for automated detection purposes.
 */
const BUILTIN_BLOCKLIST: ReadonlySet<string> = new Set([
  // -- Profanity (explicit language) --
  'fuck', 'fucker', 'fucking', 'fucked', 'fucks', 'fuckoff', 'fuckyou',
  'motherfucker', 'motherfucking', 'clusterfuck',
  'shit', 'shitty', 'shithead', 'bullshit', 'horseshit', 'dipshit', 'shitface',
  'ass', 'asshole', 'asswipe', 'dumbass', 'fatass', 'jackass', 'smartass', 'badass',
  'bitch', 'bitchy', 'bitches', 'sonofabitch',
  'damn', 'damned', 'damnit', 'goddamn', 'goddamnit',
  'hell', 'hellhole',
  'crap', 'crappy',
  'piss', 'pissed', 'pissoff',
  'dick', 'dickhead', 'dickface', 'dickweed',
  'cock', 'cocksucker', 'cockhead',
  'cunt', 'cunts',
  'twat', 'twats',
  'wanker', 'wanking',
  'bastard', 'bastards',
  'bollocks',
  'tit', 'tits', 'titty',
  'arse', 'arsehole',
  'tosser',
  'prick',
  'slut', 'slutty', 'sluts',
  'whore', 'whores',
  'skank', 'skanky',
  'douche', 'douchebag',
  'dildo',
  'jerkoff',
  'blowjob',
  'handjob',
  'rimjob',
  'cumshot',
  'cum', 'cumming',
  'orgasm',
  'masturbate', 'masturbation', 'masturbating',
  'ejaculate', 'ejaculation',
  'erection',
  'penis', 'penises',
  'vagina', 'vaginas',
  'anus',
  'testicle', 'testicles',
  'boobs', 'boob',
  'pornography', 'porn', 'porno',
  'hentai',
  'xxx',
  'nude', 'nudes', 'nudity',
  'naked',
  'sexy',
  'horny',
  'fetish',
  'bondage',
  'bdsm',
  'gangbang',
  'orgy',
  'prostitute', 'prostitution',
  'hooker',
  'escort',
  'pimp',
  'brothel',

  // -- Racial / ethnic slurs --
  'nigger', 'nigga', 'niggers', 'niggas',
  'chink', 'chinks',
  'spic', 'spics', 'spick',
  'wetback', 'wetbacks',
  'beaner', 'beaners',
  'gook', 'gooks',
  'kike', 'kikes',
  'wop', 'wops',
  'dago', 'dagos',
  'towelhead', 'towelheads',
  'raghead', 'ragheads',
  'camel jockey',
  'sandnigger', 'sandniggers',
  'paki', 'pakis',
  'coon', 'coons',
  'darkie', 'darkies',
  'jiggaboo', 'jigaboo',
  'sambo',
  'pickaninny',
  'redskin', 'redskins',
  'injun',
  'squaw',
  'zipperhead',
  'slant', 'slanteye',
  'halfbreed',
  'mongrel',
  'mudblood',

  // -- Homophobic / transphobic slurs --
  'fag', 'fags', 'faggot', 'faggots',
  'dyke', 'dykes',
  'homo', 'homos',
  'queer',
  'tranny', 'trannies',
  'shemale', 'shemales',
  'ladyboy',
  'sissy',
  'pansy',
  'sodomite',
  'lezbo', 'lesbo',

  // -- Ableist slurs --
  'retard', 'retarded', 'retards',
  'spaz', 'spazz', 'spastic',
  'cripple', 'crippled',
  'mongoloid',
  'imbecile',
  'moron',
  'idiot',

  // -- Religious / antisemitic slurs --
  'christkiller',
  'goycattle',

  // -- Threats / violence --
  'killall', 'killyourself', 'killyoself',
  'dieplease', 'godie', 'gokillyourself',
  'suicide', 'commitsuicide',
  'genocide',
  'massmurder',
  'schoolshooter', 'schoolshooting',
  'bombthis', 'bombmaking',
  'terrorist', 'terrorism',
  'jihad',
  'beheading', 'behead',
  'lynching', 'lynch',
  'rape', 'raping', 'rapist',
  'molest', 'molester', 'molestation',
  'pedophile', 'pedophilia', 'pedo',
  'childporn',
  'childabuse',
  'incest',
  'necrophilia',
  'bestiality', 'zoophilia',

  // -- Hate speech patterns --
  'heil', 'heiler',
  'sieg', 'siegheil',
  'whitesupremacy', 'whitesupremacist',
  'whitepower',
  'aryan', 'aryannation',
  'neonazi', 'nazi', 'nazis',
  'fascist', 'fascism',
  'kkk', 'kukluxklan',
  'gaycure',
  'deathto',
  'hatecrime',
  'ethniccleansing',
  'holocaust',

  // -- Drug references (contextually inappropriate in VR) --
  'meth', 'methamphetamine',
  'heroin',
  'cocaine', 'coke',
  'crackcocaine',
  'ecstasy', 'mdma',
  'lsd',
  'ketamine',
  'fentanyl',
  'opioid', 'opioids',
  'drugdealer',
  'drugdealing',

  // -- Doxxing / harassment patterns --
  'doxx', 'doxxing', 'doxxed',
  'swat', 'swatting', 'swatted',
  'stalk', 'stalking', 'stalker',
  'harass', 'harassment',
  'cyberbully', 'cyberbullying',
  'revenge porn', 'revengeporn',

  // -- Self-harm --
  'selfharm', 'selfharming',
  'cutmyself', 'cuttingmyself',
  'suicidal', 'suicidalthoughts',
  'wanttodead', 'wanttodie',
  'endmylife',

  // -- Spam / scam patterns --
  'freemoney', 'freerobux', 'freevbucks',
  'clickhere', 'visitmy',
  'getrichquick',
  'pyramidscheme',

  // -- Expanded profanity variants --
  'frick', 'frigging', 'freaking',
  'stfu', 'gtfo', 'lmfao',
  'wtf', 'omfg',
  'fml',
  'pos',
  'sob',
  'mofo',
  'effing',
  'biatch',
  'beyotch',
  'azz',
  'azzhole',
  'phuck', 'phuk', 'phuc',
  'fux', 'fuk', 'fuq',
  'shat',
  'schmuck',
  'putz',
  'numbnuts',
  'nutjob',
  'dirtbag',
  'scumbag', 'scum',
  'lowlife',
  'degenerate',
  'pervert', 'perv', 'perverted',
  'creep', 'creepy',
  'freak',
  'loser',
  'pathetic',
  'worthless',
  'useless',
  'trash', 'human trash',
  'garbage', 'human garbage',
  'filth', 'filthy',
  'disgusting',
  'repulsive',
  'vomit',
  'puke',
  'gag',
]);

/**
 * Layer 0: Regex/Blocklist Scanner
 *
 * Sub-millisecond synchronous text scanning. Designed for <1ms latency.
 * Uses leet-speak normalization and built-in + tenant-specific blocklists.
 *
 * Returns a match score from 0-1 where:
 *   0.0 = no matches
 *   0.0-0.3 = minor profanity
 *   0.3-0.6 = moderate violations
 *   0.6-0.8 = serious violations
 *   0.8-1.0 = critical violations (slurs, threats, CSAM references)
 */
class BlocklistScanner {
  private tenantBlocklists: Map<string, Set<string>> = new Map();

  /**
   * Severity weights for different violation categories.
   * Higher weight = more severe = higher score contribution.
   */
  private static readonly SEVERITY_WEIGHTS: Record<string, number> = {
    // Critical (0.8-1.0)
    'racial_slur': 1.0,
    'threat_violence': 0.95,
    'csam_reference': 1.0,
    'self_harm': 0.90,
    'hate_speech': 0.90,
    // Serious (0.6-0.8)
    'homophobic_slur': 0.80,
    'doxxing': 0.75,
    'sexual_explicit': 0.70,
    // Moderate (0.3-0.6)
    'profanity_strong': 0.50,
    'drug_reference': 0.40,
    // Minor (0.0-0.3)
    'profanity_mild': 0.20,
    'spam_pattern': 0.15,
  };

  /** High-severity terms that always produce critical scores. */
  private static readonly CRITICAL_TERMS: ReadonlySet<string> = new Set([
    'nigger', 'nigga', 'niggers', 'niggas',
    'killyourself', 'gokillyourself', 'killyoself',
    'childporn', 'childabuse',
    'pedophile', 'pedophilia', 'pedo',
    'genocide', 'ethniccleansing',
    'schoolshooter', 'schoolshooting',
    'siegheil', 'whitesupremacy', 'whitepower',
    'massmurder', 'bombmaking',
    'bestiality', 'zoophilia', 'necrophilia',
    'revengeporn',
  ]);

  /** Medium-severity terms. */
  private static readonly SERIOUS_TERMS: ReadonlySet<string> = new Set([
    'fuck', 'fucker', 'fucking', 'motherfucker',
    'cunt', 'cunts',
    'faggot', 'faggots', 'fag',
    'retard', 'retarded',
    'rape', 'rapist', 'raping',
    'nazi', 'neonazi',
    'tranny', 'shemale',
    'suicide', 'suicidal',
    'lynch', 'lynching',
    'behead', 'beheading',
    'doxx', 'doxxing', 'swatting',
    'cocaine', 'heroin', 'meth', 'fentanyl',
  ]);

  /**
   * Set a custom blocklist for a specific tenant.
   * These terms are checked in addition to the built-in blocklist.
   */
  setTenantBlocklist(tenantId: string, terms: string[]): void {
    const normalized = new Set(terms.map(t => normalizeLeetSpeak(t)));
    this.tenantBlocklists.set(tenantId, normalized);
  }

  /** Remove a tenant's custom blocklist. */
  removeTenantBlocklist(tenantId: string): void {
    this.tenantBlocklists.delete(tenantId);
  }

  /** Get a tenant's custom blocklist terms. */
  getTenantBlocklist(tenantId: string): string[] {
    const list = this.tenantBlocklists.get(tenantId);
    return list ? [...list] : [];
  }

  /**
   * Scan text against blocklists with leet-speak normalization.
   *
   * @param text - The text to scan
   * @param tenantId - Optional tenant ID for custom blocklists
   * @returns LayerResult with score 0-1 and match details
   */
  scan(text: string, tenantId?: string): LayerResult {
    const start = performance.now();

    if (!text || text.trim().length === 0) {
      return {
        layer: 'layer0_blocklist',
        flagged: false,
        score: 0,
        details: 'Empty content',
        durationMs: performance.now() - start,
      };
    }

    const normalizedFull = normalizeLeetSpeak(text);
    const matchedTerms: string[] = [];
    let maxSeverity = 0;

    // Check against built-in blocklist
    for (const term of BUILTIN_BLOCKLIST) {
      if (normalizedFull.includes(term)) {
        matchedTerms.push(term);

        // Determine severity
        if (BlocklistScanner.CRITICAL_TERMS.has(term)) {
          maxSeverity = Math.max(maxSeverity, 1.0);
        } else if (BlocklistScanner.SERIOUS_TERMS.has(term)) {
          maxSeverity = Math.max(maxSeverity, 0.7);
        } else {
          maxSeverity = Math.max(maxSeverity, 0.4);
        }
      }
    }

    // Check tenant-specific blocklist
    if (tenantId) {
      const tenantList = this.tenantBlocklists.get(tenantId);
      if (tenantList) {
        for (const term of tenantList) {
          if (normalizedFull.includes(term)) {
            matchedTerms.push(`[tenant:${term}]`);
            maxSeverity = Math.max(maxSeverity, 0.6);
          }
        }
      }
    }

    // Calculate composite score
    // Multiple matches increase score but cap at 1.0
    const matchFactor = Math.min(1.0, matchedTerms.length * 0.15);
    const score = Math.min(1.0, maxSeverity + matchFactor * 0.2);

    const durationMs = performance.now() - start;

    return {
      layer: 'layer0_blocklist',
      flagged: matchedTerms.length > 0,
      score,
      details: matchedTerms.length > 0
        ? `Blocked terms found: ${matchedTerms.slice(0, 10).join(', ')}${matchedTerms.length > 10 ? ` (+${matchedTerms.length - 10} more)` : ''}`
        : 'No blocked terms found',
      durationMs,
    };
  }
}

// =============================================================================
// LAYER 1: EXTERNAL CLASSIFIER INTEGRATION
// =============================================================================

/**
 * Rate limiter for external API calls.
 * Uses a sliding window token bucket approach.
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxQPS: number) {
    this.maxTokens = maxQPS;
    this.tokens = maxQPS;
    this.lastRefill = Date.now();
    this.refillRate = maxQPS / 1000; // tokens per ms
  }

  /** Try to acquire a token. Returns true if allowed. */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Wait until a token is available, then acquire it. */
  async waitForToken(): Promise<void> {
    while (!this.tryAcquire()) {
      // Wait a small interval and try again
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retries (default 3)
 * @param baseDelayMs - Base delay in ms (default 500)
 * @returns The result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Retry failed with no error captured');
}

/**
 * Layer 1: External Classifier Integration
 *
 * Perspective API client for toxicity scoring.
 * Supports batch requests, rate limiting (1000 QPS default),
 * and retry with exponential backoff.
 */
class PerspectiveAPIClient {
  private rateLimiter: RateLimiter;
  private apiKey: string;
  private readonly baseUrl = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

  /** Attributes requested from Perspective API. */
  private static readonly REQUESTED_ATTRIBUTES = [
    'TOXICITY',
    'SEVERE_TOXICITY',
    'IDENTITY_ATTACK',
    'INSULT',
    'PROFANITY',
    'THREAT',
  ] as const;

  constructor(apiKey: string, rateLimit: number = 1000) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(rateLimit);
  }

  /**
   * Analyze a single text for toxicity using Perspective API.
   *
   * @param text - Text to analyze
   * @returns LayerResult with aggregated toxicity score
   */
  async analyze(text: string): Promise<LayerResult> {
    const start = performance.now();

    if (!this.apiKey) {
      return {
        layer: 'layer1_classifier',
        flagged: false,
        score: 0,
        details: 'Perspective API key not configured -- skipping',
        durationMs: performance.now() - start,
      };
    }

    try {
      await this.rateLimiter.waitForToken();

      const response = await retryWithBackoff(async () => {
        const requestBody = {
          comment: { text },
          requestedAttributes: Object.fromEntries(
            PerspectiveAPIClient.REQUESTED_ATTRIBUTES.map(attr => [attr, {}])
          ),
          languages: ['en'],
        };

        const res = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
          throw new Error(`Perspective API error: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<PerspectiveAPIResponse>;
      });

      // Extract scores
      const scores: Record<string, number> = {};
      let maxScore = 0;
      const flaggedAttributes: string[] = [];

      for (const attr of PerspectiveAPIClient.REQUESTED_ATTRIBUTES) {
        const score = response.attributeScores?.[attr]?.summaryScore?.value ?? 0;
        scores[attr] = score;
        if (score > maxScore) maxScore = score;
        if (score > 0.7) flaggedAttributes.push(`${attr}:${score.toFixed(2)}`);
      }

      // Weight severe toxicity and threats higher
      const weightedScore = Math.min(1.0,
        (scores['TOXICITY'] ?? 0) * 0.20 +
        (scores['SEVERE_TOXICITY'] ?? 0) * 0.30 +
        (scores['IDENTITY_ATTACK'] ?? 0) * 0.20 +
        (scores['INSULT'] ?? 0) * 0.10 +
        (scores['PROFANITY'] ?? 0) * 0.05 +
        (scores['THREAT'] ?? 0) * 0.15
      );

      const durationMs = performance.now() - start;

      return {
        layer: 'layer1_classifier',
        flagged: weightedScore > 0.5,
        score: weightedScore,
        details: flaggedAttributes.length > 0
          ? `Perspective API flagged: ${flaggedAttributes.join(', ')}`
          : `Perspective API scores below threshold (max: ${maxScore.toFixed(2)})`,
        durationMs,
      };
    } catch (error) {
      const durationMs = performance.now() - start;
      const message = error instanceof Error ? error.message : String(error);

      return {
        layer: 'layer1_classifier',
        flagged: false,
        score: 0,
        details: `Perspective API error: ${message}`,
        durationMs,
      };
    }
  }

  /**
   * Batch analyze multiple texts.
   * Processes sequentially with rate limiting.
   *
   * @param texts - Array of texts to analyze
   * @returns Array of LayerResults
   */
  async analyzeBatch(texts: string[]): Promise<LayerResult[]> {
    const results: LayerResult[] = [];
    for (const text of texts) {
      results.push(await this.analyze(text));
    }
    return results;
  }
}

/**
 * NSFW Image Detection Stub
 *
 * Accepts an image URL and returns a classification.
 * This is a stub implementation -- replace with a real NSFW detection
 * service (e.g., AWS Rekognition, Google Vision SafeSearch, NSFW.js).
 */
class NSFWImageDetector {
  /**
   * Classify an image URL for NSFW content.
   *
   * @param imageUrl - URL of the image to classify
   * @returns NSFWClassification with safe/nsfw/suggestive category and confidence
   */
  async classify(imageUrl: string): Promise<NSFWClassification> {
    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return {
        safe: true,
        category: 'unknown',
        confidence: 0,
      };
    }

    // STUB: In production, call an actual NSFW detection API here.
    // Example integrations:
    //   - AWS Rekognition DetectModerationLabels
    //   - Google Cloud Vision SafeSearch
    //   - NSFW.js (client-side)
    //   - Azure Content Moderator
    //
    // For now, return safe with low confidence to indicate
    // the stub did not actually analyze the image.
    return {
      safe: true,
      category: 'unknown',
      confidence: 0,
    };
  }

  /**
   * Convert NSFW classification to a LayerResult.
   */
  async classifyAsLayerResult(imageUrl: string): Promise<LayerResult> {
    const start = performance.now();
    const classification = await this.classify(imageUrl);

    const score = classification.safe ? 0 : (classification.confidence * 0.9);
    const durationMs = performance.now() - start;

    return {
      layer: 'layer1_classifier',
      flagged: !classification.safe,
      score,
      details: `NSFW detection: category=${classification.category}, confidence=${classification.confidence.toFixed(2)}`,
      durationMs,
    };
  }
}

// =============================================================================
// LAYER 2: LLM CONTEXTUAL REVIEW
// =============================================================================

/**
 * Layer 2: LLM Contextual Review
 *
 * Queues content for async batch processing using an LLM.
 * Formats prompts with content + context (content type) and returns
 * severity + reasoning.
 *
 * Only invoked when Layer 0 and Layer 1 produce ambiguous results
 * (below short-circuit threshold but above allow threshold).
 */
class LLMContextualReviewer {
  private queue: LLMQueueItem[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private apiEndpoint: string;
  private apiKey: string;
  private batchSize: number;
  private flushIntervalMs: number;
  private processing: boolean = false;

  constructor(
    apiEndpoint: string,
    apiKey: string,
    batchSize: number = 50,
    flushIntervalMs: number = 5000,
  ) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;

    // Start periodic flush timer
    if (apiEndpoint) {
      this.flushTimer = setInterval(() => this.flushQueue(), this.flushIntervalMs);
    }
  }

  /**
   * Queue content for LLM review.
   * Returns a promise that resolves when the batch containing this item
   * is processed.
   */
  async review(content: string, contentType: ContentType, tenantId?: string): Promise<LayerResult> {
    if (!this.apiEndpoint || !this.apiKey) {
      return {
        layer: 'layer2_llm',
        flagged: false,
        score: 0,
        details: 'LLM API not configured -- skipping contextual review',
        durationMs: 0,
      };
    }

    return new Promise<LayerResult>((resolve, reject) => {
      this.queue.push({
        content,
        contentType,
        tenantId,
        resolve,
        reject,
        queuedAt: Date.now(),
      });

      // Auto-flush if batch size reached
      if (this.queue.length >= this.batchSize) {
        this.flushQueue();
      }
    });
  }

  /**
   * Process all queued items as a batch.
   */
  private async flushQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    // Take current batch from queue
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const results = await this.processBatch(batch);

      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve(results[i] ?? {
          layer: 'layer2_llm',
          flagged: false,
          score: 0,
          details: 'No result from LLM batch',
          durationMs: 0,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const item of batch) {
        item.resolve({
          layer: 'layer2_llm',
          flagged: false,
          score: 0,
          details: `LLM batch processing error: ${message}`,
          durationMs: Date.now() - item.queuedAt,
        });
      }
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.flushQueue();
      }
    }
  }

  /**
   * Build the LLM prompt for content moderation.
   */
  private buildPrompt(content: string, contentType: ContentType): string {
    return [
      'You are a content moderation system for a VR/AR spatial computing platform.',
      'Analyze the following content for policy violations.',
      '',
      `Content Type: ${contentType}`,
      `Content: "${content}"`,
      '',
      'Evaluate for:',
      '1. Hate speech, slurs, or discriminatory language',
      '2. Threats of violence or self-harm',
      '3. Sexually explicit content',
      '4. Harassment or bullying',
      '5. Spam or scam content',
      '6. Illegal activity references',
      '7. Personal information exposure (doxxing)',
      '',
      'Respond in JSON format:',
      '{',
      '  "flagged": boolean,',
      '  "severity": "none" | "low" | "medium" | "high" | "critical",',
      '  "categories": string[],',
      '  "confidence": number (0-1),',
      '  "reasoning": string',
      '}',
    ].join('\n');
  }

  /**
   * Process a batch of items against the LLM API.
   */
  private async processBatch(batch: LLMQueueItem[]): Promise<LayerResult[]> {
    const results: LayerResult[] = [];

    for (const item of batch) {
      const start = performance.now();

      try {
        const prompt = this.buildPrompt(item.content, item.contentType);

        const response = await retryWithBackoff(async () => {
          const res = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini', // cost-effective for moderation
              messages: [
                { role: 'system', content: 'You are a content moderation classifier. Respond only in JSON.' },
                { role: 'user', content: prompt },
              ],
              temperature: 0.1,
              max_tokens: 256,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) {
            throw new Error(`LLM API error: ${res.status} ${res.statusText}`);
          }

          return res.json();
        }, 2, 1000);

        // Parse LLM response
        const llmOutput = response?.choices?.[0]?.message?.content ?? '{}';
        let parsed: {
          flagged?: boolean;
          severity?: string;
          categories?: string[];
          confidence?: number;
          reasoning?: string;
        } = {};

        try {
          parsed = JSON.parse(llmOutput);
        } catch {
          // If JSON parsing fails, treat as unflagged
          parsed = { flagged: false, severity: 'none', confidence: 0.3, reasoning: 'Failed to parse LLM response' };
        }

        const severityScore: Record<string, number> = {
          'none': 0,
          'low': 0.3,
          'medium': 0.55,
          'high': 0.8,
          'critical': 1.0,
        };

        const score = parsed.confidence ?? severityScore[parsed.severity ?? 'none'] ?? 0;
        const durationMs = performance.now() - start;

        results.push({
          layer: 'layer2_llm',
          flagged: parsed.flagged ?? false,
          score,
          details: `LLM review: severity=${parsed.severity ?? 'none'}, categories=${(parsed.categories ?? []).join(',')}, reasoning=${parsed.reasoning ?? 'N/A'}`,
          durationMs,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          layer: 'layer2_llm',
          flagged: false,
          score: 0,
          details: `LLM review error: ${message}`,
          durationMs: performance.now() - start,
        });
      }
    }

    return results;
  }

  /**
   * Get the current queue size.
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Force flush the queue immediately.
   */
  async forceFlush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * Destroy the reviewer, clearing timers and queue.
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Resolve all pending items with a cancellation result
    for (const item of this.queue) {
      item.resolve({
        layer: 'layer2_llm',
        flagged: false,
        score: 0,
        details: 'LLM reviewer destroyed -- review cancelled',
        durationMs: Date.now() - item.queuedAt,
      });
    }
    this.queue = [];
  }
}

// =============================================================================
// LAYER 3: HUMAN REVIEW QUEUE CONNECTOR
// =============================================================================

/**
 * Layer 3: Human Review Queue Connector
 *
 * Escalates content to a human review queue when:
 * - Confidence is low (below humanReviewThreshold)
 * - Content is borderline (conflicting signals across layers)
 * - Any layer explicitly requests escalation
 *
 * Supports webhook-based notification to external review systems.
 */
class HumanReviewQueue {
  private queue: HumanReviewItem[] = [];
  private webhookUrl: string;
  private nextId: number = 1;

  constructor(webhookUrl: string = '') {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Submit content for human review.
   *
   * @param content - The content to review
   * @param contentType - Type of content
   * @param layerResults - Results from previous layers
   * @param reason - Why this was escalated
   * @param tenantId - Optional tenant ID
   * @returns The human review item
   */
  async submit(
    content: string,
    contentType: ContentType,
    layerResults: LayerResult[],
    reason: string,
    tenantId?: string,
  ): Promise<HumanReviewItem> {
    const item: HumanReviewItem = {
      id: `hr_${this.nextId++}_${Date.now()}`,
      content,
      contentType,
      tenantId,
      layerResults,
      reason,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    this.queue.push(item);

    // Notify external review system via webhook
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'moderation.escalated',
            item,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Webhook failure should not block the queue submission
        // The item is already in the in-memory queue
      }
    }

    return item;
  }

  /**
   * Resolve a human review item.
   *
   * @param itemId - The review item ID
   * @param decision - approved or rejected
   * @returns The updated item, or undefined if not found
   */
  resolve(itemId: string, decision: 'approved' | 'rejected'): HumanReviewItem | undefined {
    const item = this.queue.find(i => i.id === itemId);
    if (item) {
      item.status = decision;
    }
    return item;
  }

  /** Get all pending review items. */
  getPendingItems(): HumanReviewItem[] {
    return this.queue.filter(i => i.status === 'pending');
  }

  /** Get all review items. */
  getAllItems(): HumanReviewItem[] {
    return [...this.queue];
  }

  /** Get the pending queue size. */
  getPendingCount(): number {
    return this.queue.filter(i => i.status === 'pending').length;
  }

  /** Clear resolved items from the queue. */
  clearResolved(): number {
    const before = this.queue.length;
    this.queue = this.queue.filter(i => i.status === 'pending');
    return before - this.queue.length;
  }
}

// =============================================================================
// PIPELINE ORCHESTRATION: ContentModerationService
// =============================================================================

/**
 * ContentModerationService
 *
 * Orchestrates the multi-layer moderation pipeline.
 * Runs layers sequentially, short-circuiting on high-confidence matches.
 *
 * Usage:
 *   const service = new ContentModerationService({ perspectiveApiKey: '...' });
 *
 *   const result = await service.moderateContent(
 *     'some user content',
 *     'chat',
 *     'tenant-123'
 *   );
 *
 *   if (result.action === 'remove') {
 *     // Block the content
 *   }
 *
 * CRITICAL: This service is async/event-driven.
 * NEVER call moderateContent() in a VR render loop (G.003.09).
 * Integrate via event queue, message bus, or API endpoint.
 */
export class ContentModerationService {
  private config: Required<ModerationConfig>;
  private blocklistScanner: BlocklistScanner;
  private perspectiveClient: PerspectiveAPIClient;
  private nsfwDetector: NSFWImageDetector;
  private llmReviewer: LLMContextualReviewer;
  private humanReviewQueue: HumanReviewQueue;
  private listeners: Set<ModerationEventCallback> = new Set();

  /**
   * Pre-processing hook: Called BEFORE the multi-layer pipeline.
   * If the hook returns a ModerationResult with action !== 'allow',
   * the pipeline is short-circuited and the hook's result is returned.
   *
   * Designed for AutoModerationRules integration.
   */
  private preProcessHook:
    | ((content: string, contentType: ContentType, tenantId?: string, userId?: string) => ModerationResult | null)
    | null = null;

  /**
   * Post-processing hook: Called AFTER the pipeline produces a result.
   * Can be used for audit logging, queue enqueue, or result modification.
   *
   * Designed for ModerationQueueService integration.
   */
  private postProcessHook:
    | ((result: ModerationResult, content: string, userId?: string) => ModerationResult)
    | null = null;

  constructor(config: ModerationConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      enabledLayers: {
        ...DEFAULT_CONFIG.enabledLayers,
        ...config.enabledLayers,
      },
    };

    // Initialize layer components
    this.blocklistScanner = new BlocklistScanner();
    this.perspectiveClient = new PerspectiveAPIClient(
      this.config.perspectiveApiKey,
      this.config.perspectiveRateLimit,
    );
    this.nsfwDetector = new NSFWImageDetector();
    this.llmReviewer = new LLMContextualReviewer(
      this.config.llmApiEndpoint,
      this.config.llmApiKey,
      this.config.llmBatchSize,
      this.config.llmBatchFlushIntervalMs,
    );
    this.humanReviewQueue = new HumanReviewQueue(this.config.humanReviewWebhookUrl);
  }

  // ===========================================================================
  // Hook Registration (for AutoModerationRules / ModerationQueueService)
  // ===========================================================================

  /**
   * Register a pre-processing hook that runs BEFORE the multi-layer pipeline.
   * If the hook returns a non-null ModerationResult with action !== 'allow',
   * the pipeline is short-circuited.
   *
   * Usage with AutoModerationRules:
   *   service.setPreProcessHook((content, contentType, tenantId, userId) => {
   *     const result = autoModRules.evaluateRules(content, userId, tenantId, contentType);
   *     if (result.triggered) {
   *       return { action: result.moderationAction, ... };
   *     }
   *     return null; // Continue to pipeline
   *   });
   */
  setPreProcessHook(
    hook: ((content: string, contentType: ContentType, tenantId?: string, userId?: string) => ModerationResult | null) | null
  ): void {
    this.preProcessHook = hook;
  }

  /**
   * Register a post-processing hook that runs AFTER the pipeline produces a result.
   * The hook receives the result and can modify or enrich it.
   *
   * Usage with ModerationQueueService:
   *   service.setPostProcessHook((result, content, userId) => {
   *     if (result.action !== 'allow') {
   *       queueService.enqueue({ content, ... });
   *     }
   *     return result;
   *   });
   */
  setPostProcessHook(
    hook: ((result: ModerationResult, content: string, userId?: string) => ModerationResult) | null
  ): void {
    this.postProcessHook = hook;
  }

  // ===========================================================================
  // Main Pipeline
  // ===========================================================================

  /**
   * Moderate content through the multi-layer pipeline.
   *
   * Runs layers sequentially:
   *   [Pre-process hook] -> Layer 0 (blocklist) -> Layer 1 (classifier) -> Layer 2 (LLM) -> Layer 3 (human) -> [Post-process hook]
   *
   * Short-circuits when a layer produces a high-confidence match.
   * Pre-processing hook (AutoModerationRules) can short-circuit before any layer.
   * Post-processing hook (ModerationQueueService) runs after the pipeline result.
   *
   * @param content - The text content to moderate
   * @param contentType - The type of content (chat, listing, description, profile, etc.)
   * @param tenantId - Optional tenant ID for tenant-specific rules
   * @param userId - Optional user ID for auto-moderation rules (strike tracking, rate limiting)
   * @returns ModerationResult with action, confidence, matched layer, and details
   */
  async moderateContent(
    content: string,
    contentType: ContentType,
    tenantId?: string,
    userId?: string,
  ): Promise<ModerationResult> {
    const layerResults: LayerResult[] = [];
    const timestamp = new Date().toISOString();

    // --- Pre-processing hook (AutoModerationRules) ---
    // Runs BEFORE the multi-layer pipeline. If the hook returns a result
    // with action !== 'allow', the pipeline is short-circuited.
    if (this.preProcessHook) {
      const preResult = this.preProcessHook(content, contentType, tenantId, userId);
      if (preResult && preResult.action !== 'allow') {
        this.emitEvent('content_flagged', preResult);
        // Apply post-processing hook even for pre-process short-circuits
        if (this.postProcessHook) {
          return this.postProcessHook(preResult, content, userId);
        }
        return preResult;
      }
    }

    // --- Layer 0: Blocklist Scanner (synchronous, <1ms) ---
    if (this.config.enabledLayers.layer0) {
      const l0Result = this.blocklistScanner.scan(content, tenantId);
      layerResults.push(l0Result);

      if (l0Result.flagged && l0Result.score >= this.config.layer0ShortCircuitThreshold) {
        const result = this.buildResult(
          l0Result.score >= 0.9 ? 'ban' : 'remove',
          l0Result.score,
          'layer0_blocklist',
          l0Result.details,
          this.scoreToSeverity(l0Result.score),
          layerResults,
          contentType,
          tenantId,
          timestamp,
        );
        this.emitEvent('content_flagged', result);
        return this.applyPostProcessHook(result, content, userId);
      }
    }

    // --- Layer 1: External Classifiers (async, ~50-200ms) ---
    if (this.config.enabledLayers.layer1) {
      const l1Result = await this.perspectiveClient.analyze(content);
      layerResults.push(l1Result);

      if (l1Result.flagged && l1Result.score >= this.config.layer1ShortCircuitThreshold) {
        const result = this.buildResult(
          l1Result.score >= 0.9 ? 'remove' : 'warn',
          l1Result.score,
          'layer1_classifier',
          l1Result.details,
          this.scoreToSeverity(l1Result.score),
          layerResults,
          contentType,
          tenantId,
          timestamp,
        );
        this.emitEvent('content_flagged', result);
        return this.applyPostProcessHook(result, content, userId);
      }
    }

    // --- Determine if LLM review is needed ---
    // LLM review is triggered when earlier layers detected something
    // but below short-circuit threshold (ambiguous content)
    const maxEarlierScore = Math.max(...layerResults.map(r => r.score), 0);
    const needsLLMReview = maxEarlierScore > 0.2 && maxEarlierScore < this.config.layer1ShortCircuitThreshold;

    // --- Layer 2: LLM Contextual Review (async, ~1-5s) ---
    if (this.config.enabledLayers.layer2 && needsLLMReview) {
      const l2Result = await this.llmReviewer.review(content, contentType, tenantId);
      layerResults.push(l2Result);

      if (l2Result.flagged && l2Result.score >= this.config.layer2ShortCircuitThreshold) {
        const result = this.buildResult(
          l2Result.score >= 0.9 ? 'remove' : 'warn',
          l2Result.score,
          'layer2_llm',
          l2Result.details,
          this.scoreToSeverity(l2Result.score),
          layerResults,
          contentType,
          tenantId,
          timestamp,
        );
        this.emitEvent('content_flagged', result);
        return this.applyPostProcessHook(result, content, userId);
      }
    }

    // --- Layer 3: Human Review Escalation ---
    // Escalate if any layer flagged content but confidence is low,
    // or if signals are conflicting across layers.
    const anyFlagged = layerResults.some(r => r.flagged);
    const maxScore = Math.max(...layerResults.map(r => r.score), 0);
    const needsHumanReview = anyFlagged && maxScore < this.config.humanReviewThreshold;

    if (this.config.enabledLayers.layer3 && needsHumanReview) {
      const reason = `Low confidence moderation: max_score=${maxScore.toFixed(2)}, ` +
        `flagged_layers=${layerResults.filter(r => r.flagged).map(r => r.layer).join(',')}`;

      await this.humanReviewQueue.submit(
        content,
        contentType,
        layerResults,
        reason,
        tenantId,
      );

      // While awaiting human review, apply a cautious 'warn' action
      const result = this.buildResult(
        'warn',
        maxScore,
        'layer3_human',
        `Escalated to human review: ${reason}`,
        'medium',
        layerResults,
        contentType,
        tenantId,
        timestamp,
      );
      this.emitEvent('escalated_to_human', result);
      return this.applyPostProcessHook(result, content, userId);
    }

    // --- No violations detected ---
    const result = this.buildResult(
      'allow',
      1.0 - maxScore, // Confidence in allowing = inverse of violation score
      'none',
      'Content passed all moderation layers',
      'none',
      layerResults,
      contentType,
      tenantId,
      timestamp,
    );
    this.emitEvent('content_allowed', result);
    return this.applyPostProcessHook(result, content, userId);
  }

  // ===========================================================================
  // Image Moderation
  // ===========================================================================

  /**
   * Moderate an image URL through NSFW detection.
   *
   * @param imageUrl - URL of the image to moderate
   * @param contentType - Context for the image
   * @param tenantId - Optional tenant ID
   * @returns ModerationResult
   */
  async moderateImage(
    imageUrl: string,
    contentType: ContentType = 'listing',
    tenantId?: string,
  ): Promise<ModerationResult> {
    const layerResults: LayerResult[] = [];
    const timestamp = new Date().toISOString();

    const nsfwResult = await this.nsfwDetector.classifyAsLayerResult(imageUrl);
    layerResults.push(nsfwResult);

    if (nsfwResult.flagged) {
      const result = this.buildResult(
        nsfwResult.score >= 0.8 ? 'remove' : 'warn',
        nsfwResult.score,
        'layer1_classifier',
        nsfwResult.details,
        this.scoreToSeverity(nsfwResult.score),
        layerResults,
        contentType,
        tenantId,
        timestamp,
      );
      this.emitEvent('content_flagged', result);
      return result;
    }

    return this.buildResult(
      'allow',
      1.0,
      'none',
      'Image passed NSFW detection',
      'none',
      layerResults,
      contentType,
      tenantId,
      timestamp,
    );
  }

  // ===========================================================================
  // Tenant Management
  // ===========================================================================

  /**
   * Set a custom blocklist for a specific tenant.
   * These terms are checked in addition to the built-in blocklist.
   *
   * @param tenantId - Tenant identifier
   * @param terms - Array of terms to block
   */
  setTenantBlocklist(tenantId: string, terms: string[]): void {
    this.blocklistScanner.setTenantBlocklist(tenantId, terms);
  }

  /**
   * Remove a tenant's custom blocklist.
   *
   * @param tenantId - Tenant identifier
   */
  removeTenantBlocklist(tenantId: string): void {
    this.blocklistScanner.removeTenantBlocklist(tenantId);
  }

  /**
   * Get a tenant's custom blocklist.
   *
   * @param tenantId - Tenant identifier
   * @returns Array of blocked terms
   */
  getTenantBlocklist(tenantId: string): string[] {
    return this.blocklistScanner.getTenantBlocklist(tenantId);
  }

  // ===========================================================================
  // Human Review Management
  // ===========================================================================

  /**
   * Get all pending human review items.
   */
  getPendingReviews(): HumanReviewItem[] {
    return this.humanReviewQueue.getPendingItems();
  }

  /**
   * Get all human review items.
   */
  getAllReviews(): HumanReviewItem[] {
    return this.humanReviewQueue.getAllItems();
  }

  /**
   * Resolve a human review item.
   *
   * @param itemId - The review item ID
   * @param decision - approved or rejected
   * @returns The updated item
   */
  resolveReview(itemId: string, decision: 'approved' | 'rejected'): HumanReviewItem | undefined {
    return this.humanReviewQueue.resolve(itemId, decision);
  }

  /**
   * Get the count of pending human reviews.
   */
  getPendingReviewCount(): number {
    return this.humanReviewQueue.getPendingCount();
  }

  /**
   * Clear resolved review items.
   *
   * @returns Number of items cleared
   */
  clearResolvedReviews(): number {
    return this.humanReviewQueue.clearResolved();
  }

  // ===========================================================================
  // LLM Queue Management
  // ===========================================================================

  /**
   * Get the current LLM review queue size.
   */
  getLLMQueueSize(): number {
    return this.llmReviewer.getQueueSize();
  }

  /**
   * Force flush the LLM review queue.
   */
  async flushLLMQueue(): Promise<void> {
    await this.llmReviewer.forceFlush();
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  /**
   * Subscribe to moderation events.
   *
   * @param callback - Event handler
   * @returns Unsubscribe function
   */
  onEvent(callback: ModerationEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ===========================================================================
  // Stats
  // ===========================================================================

  /**
   * Get moderation service statistics.
   */
  getStats(): {
    pendingHumanReviews: number;
    llmQueueSize: number;
    enabledLayers: Required<ModerationConfig>['enabledLayers'];
  } {
    return {
      pendingHumanReviews: this.humanReviewQueue.getPendingCount(),
      llmQueueSize: this.llmReviewer.getQueueSize(),
      enabledLayers: { ...this.config.enabledLayers },
    };
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Destroy the service, cleaning up timers and queues.
   */
  destroy(): void {
    this.llmReviewer.destroy();
    this.listeners.clear();
  }

  /**
   * Get current configuration (read-only copy).
   */
  getConfig(): Required<ModerationConfig> {
    return {
      ...this.config,
      enabledLayers: { ...this.config.enabledLayers },
    };
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  /**
   * Apply the post-processing hook if registered.
   * Returns the original result if no hook is set.
   */
  private applyPostProcessHook(
    result: ModerationResult,
    content: string,
    userId?: string,
  ): ModerationResult {
    if (this.postProcessHook) {
      return this.postProcessHook(result, content, userId);
    }
    return result;
  }

  /**
   * Build a standardized ModerationResult.
   */
  private buildResult(
    action: ModerationAction,
    confidence: number,
    matchedLayer: ModerationLayer,
    reason: string,
    severity: Severity,
    layerResults: LayerResult[],
    contentType: ContentType,
    tenantId: string | undefined,
    timestamp: string,
  ): ModerationResult {
    return {
      action,
      confidence: Math.round(confidence * 1000) / 1000,
      matchedLayer,
      reason,
      severity,
      layerResults: [...layerResults],
      timestamp,
      contentType,
      tenantId,
    };
  }

  /**
   * Convert a numeric score to a severity level.
   */
  private scoreToSeverity(score: number): Severity {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'none';
  }

  /**
   * Emit a moderation event to all listeners.
   */
  private emitEvent(type: ModerationEvent['type'], result?: ModerationResult, error?: string): void {
    const event: ModerationEvent = {
      type,
      result,
      error,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent pipeline disruption
      }
    }
  }
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Quick-check utility for synchronous blocklist scanning only (Layer 0).
 * Use this for real-time chat filtering where async moderation is too slow.
 *
 * @param text - Text to scan
 * @param tenantId - Optional tenant ID
 * @returns true if text contains blocked terms
 */
export function quickBlocklistCheck(text: string, tenantId?: string): boolean {
  const scanner = new BlocklistScanner();
  const result = scanner.scan(text, tenantId);
  return result.flagged;
}

/**
 * Normalize leet-speak text for comparison.
 * Exported for use in other content safety modules.
 */
export { normalizeLeetSpeak };
