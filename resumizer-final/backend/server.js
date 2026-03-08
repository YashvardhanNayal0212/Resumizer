// ══════════════════════════════════════════════════════════
//  Resumizer Backend — Express server for Railway
//  Proxies Claude API with IP rate limiting (5/day)
// ══════════════════════════════════════════════════════════

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY env var is not set. Exiting.');
  process.exit(1);
}

// ── Trust proxy (Railway sits behind one) ──────────────────
app.set('trust proxy', 1);

// ── CORS — allow Chrome extensions + browsers ──────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '2mb' }));

// ── Request logger ─────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Rate limiter — 5 analyses per IP per 24h ───────────────
const analyzeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,   // 24 hours
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req =>
    req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket.remoteAddress
    || 'unknown',
  handler: (req, res) => {
    const resetMs   = req.rateLimit.resetTime - Date.now();
    const hoursLeft = Math.ceil(resetMs / 3_600_000);
    res.status(429).json({
      error:     'rate_limited',
      message:   `You've used all ${req.rateLimit.limit} free analyses for today. Resets in ${hoursLeft}h.`,
      resetsIn:  hoursLeft,
      limit:     req.rateLimit.limit,
      used:      req.rateLimit.used
    });
  }
});

// ── Health ─────────────────────────────────────────────────
app.get('/',       (_, res) => res.json({ service: 'Resumizer API', status: 'ok', version: '1.0.0' }));
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Main analyze endpoint ──────────────────────────────────
app.post('/analyze', analyzeLimiter, async (req, res) => {
  const { resumeText, jdText, jobTitle } = req.body;

  // Validate
  if (!resumeText || resumeText.trim().length < 50)
    return res.status(400).json({ error: 'bad_request', message: 'Resume text is required (min 50 chars).' });
  if (!jdText || jdText.trim().length < 50)
    return res.status(400).json({ error: 'bad_request', message: 'Job description is required (min 50 chars).' });

  const system = `You are an expert ATS resume coach. Analyze resumes vs job descriptions with precision.
Respond ONLY with a valid JSON object. No markdown fences, no extra text, nothing before or after the JSON.`;

  const prompt = `Analyze this resume against the job description. Return ONLY a valid JSON object with EXACTLY this shape:

{
  "matchScore": <integer 0-100>,
  "scoreTitle": <"Strong Match" | "Good Match" | "Fair Match" | "Weak Match">,
  "scoreDesc": <string: 1-2 sentences explaining the match>,
  "matchedKeywords": <string[]: up to 8 keywords already present in resume>,
  "missingKeywords": <string[]: up to 8 important keywords from JD missing in resume>,
  "insights": <string[]: exactly 4 short actionable insights>,
  "suggestions": [
    {
      "type": <"Bullet Rewrite" | "Skill Addition" | "Summary Update" | "Keyword Alignment">,
      "before": <string: original text from resume — empty string if adding new content>,
      "after": <string: improved version with relevant keywords naturally incorporated>,
      "reason": <string: 1 sentence explaining why this improves ATS score>
    }
  ],
  "optimizedResume": <string: full resume rewritten for ATS, use \\n for newlines, plain text only>
}

STRICT RULES:
- NEVER invent companies, titles, dates, metrics, or skills not in the original resume
- Only enhance existing content — improve phrasing, add naturally fitting keywords
- optimizedResume must be plain text, no markdown, no tables, no columns
- Include 3-5 suggestions
- Keep everything honest and authentic

JOB TITLE: ${(jobTitle || '').substring(0, 120)}

JOB DESCRIPTION:
${jdText.substring(0, 4000)}

CANDIDATE RESUME:
${resumeText.substring(0, 4000)}`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'upstream_error', message: 'AI service error. Please try again.' });
    }

    const upData  = await upstream.json();
    const rawText = upData.content?.[0]?.text || '';

    // Parse — strip accidental fences
    let parsed;
    try {
      const clean = rawText.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('JSON parse error. Raw:', rawText.substring(0, 400));
      return res.status(502).json({ error: 'parse_error', message: 'AI returned unexpected format. Please try again.' });
    }

    // Attach meta
    const used      = req.rateLimit?.used  ?? 1;
    const remaining = req.rateLimit?.limit
      ? Math.max(0, req.rateLimit.limit - used)
      : 4;

    parsed._meta = {
      analysesUsed:      used,
      analysesRemaining: remaining,
      limit:             5
    };

    return res.json(parsed);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Internal error. Please try again.' });
  }
});

// ── 404 ────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'not_found' }));

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Resumizer backend running on port ${PORT}`);
  console.log(`    Rate limit : 5 analyses / IP / 24h`);
  console.log(`    Model      : claude-sonnet-4-20250514`);
});
