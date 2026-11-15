// Left-hand clefs on keyboard scores. Sapp's kern editions sometimes put the lower staff in treble clef for bars that
// go well below that staff (K. 545 i mm. 18-21 reach C#3). Rule: a bar of the lower staff written in treble clef whose
// lowest note is A3 or below (two or more ledger lines under the treble staff) is drawn in bass clef instead.
// Bars with a clef change of their own in the middle are left as the edition wrote them; nothing else changes.
const LOWEST_TREBLE = 59;   // B3: lower than this in treble clef = move the bar to bass clef
const clefOf = s => (/clef=(\w+)/.exec(s) || [])[1];

function lowest(bar) {
  const t = bar.replace(/"[^"]*"/g, "").replace(/\[[A-Za-z]:[^\]]*\]/g, "").replace(/![^!]*!/g, "").replace(/\+[^+]*\+/g, "");
  let lo = Infinity;
  for (const m of t.matchAll(/[\^_=]*([A-Ga-g])([,']*)/g)) {
    const L = m[1], base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[L.toUpperCase()] + (L === L.toUpperCase() ? 60 : 72);
    lo = Math.min(lo, base + 12 * ((m[2].match(/'/g) || []).length - (m[2].match(/,/g) || []).length));
  }
  return lo;
}

// split a voice's music into bars: [{ sep, body }], sep = the bar line before the body
const SEP = /(:*\|+[\]:]*|\[\|)/;
function bars(music) {
  const parts = music.split(SEP), out = [{ sep: "", body: parts[0] }];
  for (let i = 1; i < parts.length; i += 2) out.push({ sep: parts[i], body: parts[i + 1] || "" });
  return out;
}

export function fixClefs(abc) {
  const lines = abc.split("\n"), header = {}, voiceLine = {};
  lines.forEach((l, i) => { let m = /^V:(\S+)(.*)$/.exec(l); if (m) header[m[1]] = { i, clef: clefOf(m[2]) || "treble" };
    m = /^\[V:(\S+)\] /.exec(l); if (m) voiceLine[m[1]] = i; });
  const staves = {};
  for (const id of Object.keys(voiceLine)) { const st = (/^s(\d+)/.exec(id) || [])[1]; if (st && st !== "1") (staves[st] = staves[st] || []).push(id); }
  let changed = false;
  for (const ids of Object.values(staves)) {
    const vb = ids.map(id => bars(lines[voiceLine[id]].slice(`[V:${id}] `.length)));
    const n = Math.min(...vb.map(b => b.length));
    // the clef each bar is written in (the clef at its first note), and the lowest note across the staff's voices
    const src = [], want = [], lows = [], endClef = [], midChange = []; let cur = header[ids[0]].clef;
    for (let b = 0; b < n; b++) {
      // clef changes before the bar's first note or rest count as the bar's clef
      const body = vb[0][b].body, masked = body.replace(/"[^"]*"|\[[A-Za-z]:[^\]]*\]/g, m => "#".repeat(m.length)), firstNote = masked.search(/[A-Ga-gzx]/);
      let atStart = cur;
      for (const m of body.matchAll(/\[K:[^\]]*clef=(\w+)/g)) { cur = m[1]; if (firstNote < 0 || m.index < firstNote) atStart = cur; else midChange[b] = true; }
      endClef.push(cur);
      src.push(atStart);
      const lo = Math.min(...vb.map(v => lowest(v[b].body))); lows.push(lo);
      want.push(atStart === "treble" && lo < LOWEST_TREBLE ? "bass" : atStart);
    }
    const moved = want.map((w, i) => w !== src[i] && !midChange[i]);
    if (!moved.some(Boolean)) continue;
    changed = true;
    // only the moved bars change: their clefs go, bass is written at the start, and the clef the edition had at the
    // end of the bar is written again at the start of the next one
    ids.forEach((id, k) => {
      const out = vb[k].map((bar, i) => {
        let body = bar.body;
        if (moved[i]) { body = body.replace(/\[K:clef=\w+\]\s*/g, "");
          if (i === 0) { lines[header[id].i] = lines[header[id].i].replace(/clef=\w+/, "clef=bass"); return bar.sep + body; }   // abcjs fails on an inline clef that opens a second voice
          if (i > 0 && (moved[i - 1] || endClef[i - 1] === "bass")) return bar.sep + body;   // already in bass clef: no new clef sign
          const lead = /^(\s*(?:\[\d\s*)?)/.exec(body)[1]; body = lead + "[K:clef=bass] " + body.slice(lead.length); }
        else if (i > 0 && moved[i - 1] && endClef[i - 1] !== "bass" && !/^\s*(?:\[\d\s*)?\[K:[^\]]*clef=/.test(body)) { const lead = /^(\s*(?:\[\d\s*)?)/.exec(body)[1]; body = lead + `[K:clef=${endClef[i - 1]}] ` + body.slice(lead.length); }
        return bar.sep + body;
      }).join("");
      lines[voiceLine[id]] = `[V:${id}] ` + out;
    });
  }
  return changed ? lines.join("\n") : abc;
}
