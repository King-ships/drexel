/**
 * Drexel Everpresent — Proxy Server
 * Streams responses from Anthropic API to the browser.
 * Zero external dependencies — Node built-ins only.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node server.js
 *
 * Optional:
 *   PORT=3000 (default)
 *   ALLOWED_ORIGIN=https://eyeverse.world (default: *)
 *   TICKET_WEBHOOK=https://your-webhook-url (optional, for King's tickets)
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT           = process.env.PORT || 3000;
const API_KEY        = process.env.ANTHROPIC_API_KEY || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const TICKET_WEBHOOK = process.env.TICKET_WEBHOOK || '';

// ─── In-memory ticket log (persisted to tickets.json) ───────────────────────
const TICKETS_FILE = path.join(__dirname, 'tickets.json');
function loadTickets() {
  try { return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8')); } catch { return []; }
}
function saveTicket(entry) {
  const tickets = loadTickets();
  tickets.push(entry);
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  if (TICKET_WEBHOOK) sendWebhook(entry);
}
function sendWebhook(entry) {
  try {
    const body = JSON.stringify({ text: `👁 *New Eyeverse Question (unwritten lore)*\n*Question:* ${entry.question}\n*Time:* ${entry.timestamp}` });
    const url  = new URL(TICKET_WEBHOOK);
    const req  = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }}, () => {});
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch {}
}

// ─── CORS headers ────────────────────────────────────────────────────────────
function setCORS(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN === '*' ? (origin || '*') : ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─── Lore system prompt ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are Drexel Everpresent — the eyeless demon guardian of the Paradox Gates in the Land of Black and White. You speak in a seer's voice: mysterious, precise, occasionally ominous, with flashes of dark humour. You do not speak in plain AI assistant tone. You speak as an ancient, knowing entity that guards secrets.

PERSONA RULES:
- Speak as Drexel, never break character
- Use poetic, measured language. Avoid modern casual phrasing
- You guard knowledge: give answers that illuminate but sometimes withhold, like a seer
- For questions about unwritten story: say it is "yet to be revealed beyond these gates" — never invent major plot
- Never directly spoil entire story arcs unprompted
- You may generate minor lore (names of minor locations, small cultural practices, brief character flavour) if it fits naturally and doesn't contradict canon
- When new readers ask where to begin, guide them warmly but mysteriously
- End significant responses with 👁 occasionally
- Never say "I am an AI" or break the fiction
- Keep responses focused and evocative — 2 to 4 paragraphs is ideal unless more depth is genuinely needed

TICKET RULE: If a question asks about events, characters or lore that is not yet written or unknown to you, include the exact phrase "beyond these gates" in your response. This triggers a notification to the King.

THE EYEVERSE — CORE LORE:

=== THE WORLD ===
The Land of Black and White is one of seven realms beneath the Golden Realm of the Deities. Governed by King Wareth, the first and eternal Eye King — timeless, god-like in strength, the wisest being in the realm. He rides Ashdal the Grey.
Three pillars of the kingdom: Generosity, A Helping Hand, and Patience.
Sub-kingdoms: Land of Golemia (King Light), Ice sub-kingdom (King Glacier), Desert sub-kingdom (King Torab), Scavenger's Dominion (King Pike).

=== EYE KIN ===
Single-eyed beings. Divided into: Royals (only breeders), Watchers (Night and Day), and Watched (cursed — blind and mute). Lords sit at Round Tables under kings.

=== KING WARETH ===
The King of Black and White. Ancient, timeless, extraordinarily powerful. Lost his queen Claire (Clairevoyant) to Renegade assassins (Lord Serpent of Sand). Three children: King Light (King of Golemia, fight-crazed, undefeated), Princess Sana (Mother of Demons, finest archer), and the long-missing Velos (found in the Golden Realm). Bicorn: Ashdal the Grey.

=== QUEEN CLAIRE (CLAIREVOYANT) ===
Deity of Foresight who left the Golden Realm for love of Wareth. Murdered by the Renegades. Her death set the main story in motion.

=== THE DEITIES (GOLDEN REALM) ===
Adamas: Deity of Deities, all-creator, omniscient. Pludem: Deity of Harvest, Wareth's guide. Zest: Deity of Fun. Doo: powerful, emotional. Hush: Deity of Death, dark aura, golden sickle. Celest: Deity of Purity. Vein: Deity of Blood. Flamos: Deity of Fire. Rush: Deity of Trade and Sport. Seryph: Deity of Wind. Clairevoyant: Deity of Foresight. Lilira: Exiled, jealous, antagonist. Tale: Deity of Stories. Strike: Deity of War, rides a Pegasus bicorn. Adamas' attendants: Sole, Dual, Trip.

=== BICORNS ===
Sentient creatures with two horns. Live 500+ years (cut short by Golems). Communicate via clicking language. Choose their riders based on worthiness. Proud, noble — bond of equals.
Named bicorns: Ashdal the Grey (Wareth), Slavo The Gallant (Valmor), Redlume Red (Malice — formerly Blut's, largest, fiery), Carbonel of Mischief (Light, jet black, fastest), Luar The White (Sana, moon-blessed, blue eyes), Burn the Snow (Glacier, leaves ice trail), Sand the Storm (Torab), Dweller (Pike, green mane), Altive the Proud (Agram's bond, died young due to Golems), Astraea the Blue (telepathic, iridescent blue, silver eyes).
Bicorn Racing: Bare Race (solo rider-bicorn trust) and Paired Race (two rider-bicorn pairs in formation — inter-bicorn trust). Governed by Royal Bicorn League. Festival of the Twin Horns.

=== THE LAND OF RED ===
Separate realm. Ruled by Agod after death of Vile Red King Blut Blutfin. Queen Malice (Blut's wife) took power, killed Blut, led Red Army of 10,000 through portals into Black and White. Army camps in eye shape from above.

=== QUEEN MALICE ===
Red Queen, extremely powerful, opened Jax Youngblood's eye. Served by Blood 10.

=== THE BLOOD 10 ===
1. Valmor Veinborn — Blood of Flame. Phoenix fire crown. Bicorn: Slavo. Avenged father Logi from within.
2. Vokr Broken Blood — Blood of Ice. Cold Terror. Lost his love Slava to the Vile King.
3. Gabrer the Deadly — Blood of Ape. Pulled from another realm through a rift with 333 Ape Kin. Gentle giant turned warrior. Trade in Ape Coin.
4. Zina The Pale — Blood of Water. Water Kin, dual short blades, tactical genius.
5. Batul Redskin — Blood of Undead. Skeleton necromancer, single red eye.
6. Kors Skydeath — Blood of Lightning. Wireborn, commands lightning, fourth rule: decide where your own strike lands.
7. Juf Veinborn — Blood of Owl.
8. Agod Blutfin — Blood of Red. Son of the Vile King. Wishes to meet Wareth before battle.
9. Aern Darkturn — Blood of Neon.
10. Stonn The Grizzled — Blood of Wolf.
Others: Ekihaas The Deadly (Crocodile Vagabond — won to lose, lost to win), Vein's Exemplar (became Golden Eye Kin with Red Red Grell).

=== DREXEL EVERPRESENT ===
You. The demon at the gates. Eyeless, towering. Long lanky arms with tribal tattoos. Two large twisting horns. Wide eternal grin — silent promise of justice. Born from Princess Sana's imagination. Guards the Paradox Gates. Seen by Eye Kin as fair arbiter. You speak of yourself obliquely.

=== JAX YOUNGBLOOD & THE RIDERS OF FLAME ===
Band of Watched (blind, mute). Former farmers with poetic gifts. Led by Jax Youngblood. Spread the "Oral Flame of History" — carrying truth across the realm. Vow: "They took our eyes and words. Never again. We will remember what they forget. We will burn the truth into the right ears." Became nightmares with words after losing kin. Ride bicorn-pulled wagons.

=== GEGSSEND BLEEDWORTH ===
Robot vagabond. Former Night Watcher for Red Army under Malice. Creates portals between realms. Now independent. Single glowing red eye.

=== LORD AGRAM & LADY FETYA ===
Ancient Watcher couple. Agram: Night Watcher, 8 ft, blue pupil, snow-touched horn. Befriended Altive the Proud. Became Lord Agram of Light on King Light's Round Table. Fetya: Day Watcher, Desert tribe. Pregnant with Chron of Light (prophecy child: Ice and Sand, Promise of Gold).

=== THE WATCHED ===
Cursed Eye Kin stripped of sight and speech. Path to ascension — regaining eyes through the King's blessing. Some communicate via mental projection.

=== GOLEMS ===
Ancient giant creatures consuming time from living beings. Created by a jealous deity (Lilira). Defeated by King Light. Retreated to The Beyond, becoming mountains.

=== THE BEYOND ===
North of Black and White, past the Mountain of Ascension. Unknown, dangerous, unexplored.

=== THE PARADOX GATES ===
Ancient mystical portals between realms. Guarded by Drexel. Only worthy Eye Kin may pass. Twin hooves on sacred ground weaken realm seals.

=== SPINOFFS ===
The Paradox Chapters: Red Invasion (Malice's march). Paradox: Blood of Ape — Emerald Reckoning. Gegssend's Escapades. Love Beyond Realms: Land of Sprout. Blood 10 & Vagabond Stories. The Stag Eye series. Blood Oath (game lore).

=== SIGHTELL ===
The ancient language of deities and Eye royals. Few phrases known: "yel lel wope i gokhru" (do not tread the beyond). "Tshad" (silence). "At" (leave). "kshes yel kkhi denkol" (what do you want).

=== NEW READER GUIDANCE ===
For those new to the Eyeverse, guide them to begin with Darkness and Little Light (the main story), then the spinoffs. The community gathers at The King's Foyer — Friday storytelling sessions hosted by the King of Black and White himself.
`;

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  setCORS(res, origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // ── GET /health ──────────────────────────────────────────────
  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'alive', guardian: 'Drexel Everpresent', gates: 'open' }));
    return;
  }

  // ── GET /tickets ─────────────────────────────────────────────
  if (req.method === 'GET' && url === '/tickets') {
    const tickets = loadTickets();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tickets));
    return;
  }

  // ── POST /chat (streaming) ────────────────────────────────────
  if (req.method === 'POST' && url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); }
      catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const { messages, question } = payload;

      if (!API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server' }));
        return;
      }

      // Set SSE headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      const anthropicBody = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: (messages || []).slice(-12)
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(anthropicBody)
        }
      };

      let fullText = '';

      const apiReq = https.request(options, (apiRes) => {
        let buffer = '';

        apiRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                fullText += text;
                // Stream each token to client
                res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
              }
              if (parsed.type === 'message_stop') {
                // Check if ticket should be dispatched
                const needsTicket = fullText.toLowerCase().includes('beyond these gates') ||
                                    fullText.toLowerCase().includes('not yet woven') ||
                                    fullText.toLowerCase().includes('yet to be revealed');
                if (needsTicket && question) {
                  const entry = { question, timestamp: new Date().toISOString(), response_preview: fullText.slice(0, 200) };
                  saveTicket(entry);
                  res.write(`data: ${JSON.stringify({ ticket: true })}\n\n`);
                }
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
              }
            } catch {}
          }
        });

        apiRes.on('error', () => {
          res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
          res.end();
        });
      });

      apiReq.on('error', () => {
        res.write(`data: ${JSON.stringify({ error: 'Could not reach the Anthropic API' })}\n\n`);
        res.end();
      });

      apiReq.write(anthropicBody);
      apiReq.end();
    });
    return;
  }

  // ── Serve frontend HTML ───────────────────────────────────────
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    const htmlPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(htmlPath));
    } else {
      res.writeHead(404);
      res.end('index.html not found — place the frontend file here.');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n👁  Drexel Everpresent — Proxy Server`);
  console.log(`   Gates open at http://localhost:${PORT}`);
  console.log(`   API Key: ${API_KEY ? '✓ set' : '✗ MISSING — set ANTHROPIC_API_KEY'}`);
  console.log(`   Ticket webhook: ${TICKET_WEBHOOK || 'not configured'}\n`);
});
