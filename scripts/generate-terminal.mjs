// Generates assets/terminal.svg: an animated neofetch-style terminal with your
// GitHub avatar embedded and live stats. Runs in a GitHub Action (Node 20+),
// no dependencies. Locally: `node scripts/generate-terminal.mjs`
// Optional env: GITHUB_USER, GITHUB_TOKEN, AVATAR_PATH (use a local image instead).
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";

const USER = process.env.GITHUB_USER || "IamRoman-rb";
const TOKEN = process.env.GITHUB_TOKEN;
const headers = { "User-Agent": USER, Accept: "application/vnd.github+json" };
if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

async function getJSON(url) {
  try {
    const r = await fetch(url, { headers });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function getAvatar(url) {
  if (process.env.AVATAR_PATH) {
    const buf = readFileSync(process.env.AVATAR_PATH);
    const ext = process.env.AVATAR_PATH.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  }
  if (!url) return null;
  try {
    const r = await fetch(`${url}&s=300`);
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "image/jpeg";
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch { return null; }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const user = await getJSON(`https://api.github.com/users/${USER}`);
const commits = await getJSON(`https://api.github.com/search/commits?q=author:${USER}&per_page=1`);
const avatar = await getAvatar(user?.avatar_url);

const now = new Date();
const codingYears = now.getFullYear() - 2021; // started coding (Digital House) in 2021
const updated = now.toLocaleString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" });

// [key, value] — key null = plain line
const lines = [
  ["Role", "Full-Stack Developer & IT Admin @ OSF Broker"],
  ["Also", "Network & Broadcast Tech @ BeloSport"],
  ["Studies", "Computer Engineering @ UADE"],
  ["Uptime", `${codingYears} years writing code`],
  ["Languages", "JavaScript, TypeScript, Python, Java, SQL, PHP"],
  ["Frontend", "React, Vue.js, Vite, Tailwind, Flutter"],
  ["Backend", "Node.js, Express, Laravel, Socket.IO, REST"],
  ["DevOps", "Linux, NGINX, PM2, VPS, Let's Encrypt"],
  ["Data", "SQL, SQLite, Firebase, JSON stores"],
  ["AI / Auto", "n8n, LLM APIs (Groq), ML Kit"],
  ["GitHub", `${user?.public_repos ?? "—"} public repos · ${user?.followers ?? "—"} followers${commits?.total_count != null ? ` · ${commits.total_count} commits` : ""}`],
];

const W = 900, H = 470;
const X = 300;               // text column
const Y0 = 132, LH = 23;     // first info line, line height
const CYCLE = 16;            // seconds per loop

const C = {
  bg: "#0d1117", bar: "#161b22", border: "#30363d", text: "#c9d1d9", dim: "#8b949e",
  accent: "#58a6ff", green: "#3fb950", pink: "#f778ba", yellow: "#d29922",
};

// Each element appears at `t` seconds and stays until the loop restarts.
const kf = (name, t) => {
  const a = ((t / CYCLE) * 100).toFixed(2);
  const b = (((t + 0.35) / CYCLE) * 100).toFixed(2);
  return `@keyframes ${name}{0%,${a}%{opacity:0;transform:translateX(-6px)}${b}%,94%{opacity:1;transform:none}100%{opacity:0}}`;
};

let css = "", body = "";
const reveal = (id, t) => { css += kf(id, t) + `.${id}{opacity:0;animation:${id} ${CYCLE}s linear infinite}`; return id; };

// typed command
css += `@keyframes type{0%{clip-path:inset(0 100% 0 0)}10%,94%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 100% 0 0)}}
.cmd{animation:type ${CYCLE}s steps(16,end) infinite}
@keyframes blink{50%{opacity:0}} .cursor{animation:blink 1s step-end infinite}
@keyframes ring{0%,100%{stroke:${C.accent}}50%{stroke:${C.pink}}} .ring{animation:ring 6s ease-in-out infinite}
text{font-family:'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace}`;

body += `<text x="28" y="74" font-size="15"><tspan fill="${C.green}">roman@uade</tspan><tspan fill="${C.text}">:</tspan><tspan fill="${C.accent}">~</tspan><tspan fill="${C.text}">$</tspan></text>
<g class="cmd"><text x="158" y="74" font-size="15" fill="${C.text}">neofetch --user ${esc(USER)}</text></g>`;

// avatar
const avX = 150, avY = 255, avR = 105;
body += `<g class="${reveal("av", 1.6)}">
<circle cx="${avX}" cy="${avY}" r="${avR + 6}" fill="none" stroke-width="3" class="ring"/>
${avatar
  ? `<image href="${avatar}" x="${avX - avR}" y="${avY - avR}" width="${avR * 2}" height="${avR * 2}" clip-path="url(#avclip)" preserveAspectRatio="xMidYMid slice"/>`
  : `<circle cx="${avX}" cy="${avY}" r="${avR}" fill="${C.bar}"/><text x="${avX}" y="${avY + 18}" font-size="54" fill="${C.accent}" text-anchor="middle">RB</text>`}
</g>`;

// header
body += `<g class="${reveal("h0", 1.8)}"><text x="${X}" y="${Y0 - 34}" font-size="16" font-weight="700"><tspan fill="${C.accent}">Román</tspan><tspan fill="${C.text}">@</tspan><tspan fill="${C.pink}">Borla</tspan></text>
<text x="${X}" y="${Y0 - 16}" font-size="14" fill="${C.dim}">${"─".repeat(30)}</text></g>`;

lines.forEach(([k, v], i) => {
  const id = reveal(`l${i}`, 2.1 + i * 0.32);
  body += `<g class="${id}"><text x="${X}" y="${Y0 + 6 + i * LH}" font-size="14"><tspan fill="${C.accent}" font-weight="700">${esc(k)}</tspan><tspan fill="${C.dim}">: </tspan><tspan fill="${C.text}">${esc(v)}</tspan></text></g>`;
});

// color blocks
const pal = ["#484f58", "#ff7b72", "#3fb950", "#d29922", "#58a6ff", "#bc8cff", "#39c5cf", "#f0f6fc"];
const bY = Y0 + 6 + lines.length * LH + 4;
body += `<g class="${reveal("pal", 2.2 + lines.length * 0.32)}">${pal.map((c, i) => `<rect x="${X + i * 30}" y="${bY}" width="26" height="14" rx="2" fill="${c}"/>`).join("")}</g>`;

// prompt with cursor + last update
const pY = H - 26;
body += `<g class="${reveal("pr", 2.6 + lines.length * 0.32)}"><text x="28" y="${pY}" font-size="15"><tspan fill="${C.green}">roman@uade</tspan><tspan fill="${C.text}">:</tspan><tspan fill="${C.accent}">~</tspan><tspan fill="${C.text}">$ </tspan></text>
<rect x="166" y="${pY - 14}" width="9" height="17" fill="${C.text}" class="cursor"/></g>
<text x="${W - 24}" y="${pY}" font-size="11" fill="${C.dim}" text-anchor="end">updated ${esc(updated)} (ART)</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Román Borla — neofetch terminal">
<title>Román Borla — Full-Stack Developer</title>
<defs><clipPath id="avclip"><circle cx="${avX}" cy="${avY}" r="${avR}"/></clipPath></defs>
<style>${css}</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${C.bg}" stroke="${C.border}"/>
<path d="M12.5 .5h${W - 25}a12 12 0 0 1 12 12v24h-${W - 1}v-24a12 12 0 0 1 12-12z" fill="${C.bar}"/>
<circle cx="24" cy="19" r="6" fill="#ff5f57"/><circle cx="44" cy="19" r="6" fill="#febc2e"/><circle cx="64" cy="19" r="6" fill="#28c840"/>
<text x="${W / 2}" y="23" font-size="12" fill="${C.dim}" text-anchor="middle">roman@uade: ~ — zsh</text>
${body}
</svg>`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/terminal.svg", svg);
console.log(`terminal.svg written (${(svg.length / 1024).toFixed(1)} KB, avatar: ${avatar ? "yes" : "fallback"})`);
