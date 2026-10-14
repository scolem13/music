// apps/lsa/store.js
//
// localStorage-backed data store for the LSA evaluation tools. Placeholder class of
// 6 students (1 low aptitude, 1 high, 4 average) seeded on first load. This is a
// stand-in for the Supabase-backed roster + records that will replace it later —
// keep the shape of getDB()/saveDB() stable so that swap is a storage-layer change,
// not a UI rewrite.

(function (global) {
  'use strict';

  const DB_KEY = 'lsa-db-v1';
  const APTITUDE_LOW = 20;   // percentile <= this => low aptitude
  const APTITUDE_HIGH = 80;  // percentile >= this => high aptitude

  // Seating chart: 8 columns x 5 rows (40 seats), 0-indexed. Hand-placed for now —
  // clustered near the center (cols 3-5, rows 1-2) rather than spread across the
  // whole grid, so "zoom to fit class" crops to a visibly smaller region than
  // "zoom to fit grid" (8x5) and the difference is actually testable with only 6
  // students. Real classes will be more spread out; interleave aptitude tiers
  // rather than seating them in a block regardless (LSA-Instructions.pdf, "high
  // aptitude students should be placed strategically among students with average
  // and low music aptitudes"). Real seat assignment will later be generated from
  // aptitude test scores.
  const SEATING_COLS = 8;
  const SEATING_ROWS = 5;

  const SEED_STUDENTS = [
    { id: 's1', name: 'Priya S.', aptitude: 96, seat: { row: 1, col: 4 } }, // high
    { id: 's2', name: 'Ada K.',   aptitude: 48, seat: { row: 1, col: 3 } }, // average
    { id: 's3', name: 'Miles R.', aptitude: 55, seat: { row: 1, col: 5 } }, // average
    { id: 's4', name: 'Zoe L.',   aptitude: 62, seat: { row: 2, col: 5 } }, // average
    { id: 's5', name: 'Owen T.',  aptitude: 41, seat: { row: 2, col: 4 } }, // average
    { id: 's6', name: 'Nate B.',  aptitude: 11, seat: { row: 2, col: 3 } }, // low
  ];

  function aptitudeTier(score) {
    if (score <= APTITUDE_LOW) return 'low';
    if (score >= APTITUDE_HIGH) return 'high';
    return 'average';
  }

  function defaultDB() {
    return {
      version: 1,
      students: SEED_STUDENTS.map(function (s) { return Object.assign({}, s); }),
      records: {},    // records[studentId][criterionId][level] = {teach,evalN,taught,achieved,beyond}
      totals: {},     // totals[studentId] = total attempts (teach+eval), the equal-time proxy
      lastGiven: {},  // lastGiven[studentId] = ISO timestamp of most recent attempt
      createdAt: new Date().toISOString(),
    };
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function getDB() {
    let db;
    try {
      const raw = localStorage.getItem(DB_KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) {
      db = null;
    }
    if (!db) { db = defaultDB(); saveDB(db); return db; }
    // heal missing fields (forward-compat with older saves)
    if (!db.students || !db.students.length) db.students = SEED_STUDENTS.map(function (s) { return Object.assign({}, s); });
    if (!db.records) db.records = {};
    if (!db.totals) db.totals = {};
    if (!db.lastGiven) db.lastGiven = {};
    return db;
  }

  function resetDB() {
    const db = defaultDB();
    saveDB(db);
    return db;
  }

  function cell(db, studentId, criterionId, level) {
    db.records[studentId] = db.records[studentId] || {};
    db.records[studentId][criterionId] = db.records[studentId][criterionId] || {};
    if (!db.records[studentId][criterionId][level]) {
      db.records[studentId][criterionId][level] =
        { teach: 0, evalN: 0, taught: false, achieved: false, beyond: false };
    }
    return db.records[studentId][criterionId][level];
  }

  // Records one attempt. mode: 'teach' | 'eval'. success: boolean.
  // beyond: true when this level is beyond the student's aptitude-based potential
  // for this criterion (kept on the cell once set, for reporting).
  function recordAttempt(db, studentId, criterionId, level, mode, success, beyond) {
    const c = cell(db, studentId, criterionId, level);
    if (mode === 'teach') {
      c.teach += 1;
      if (success) c.taught = true;
    } else {
      c.evalN += 1;
      if (success) c.achieved = true;
    }
    if (beyond) c.beyond = true;
    db.totals[studentId] = (db.totals[studentId] || 0) + 1;
    db.lastGiven[studentId] = new Date().toISOString();
    saveDB(db);
    return c;
  }

  function getCell(db, studentId, criterionId, level) {
    return (db.records[studentId] && db.records[studentId][criterionId] &&
      db.records[studentId][criterionId][level]) || null;
  }

  global.LSA_STORE = {
    DB_KEY: DB_KEY,
    APTITUDE_LOW: APTITUDE_LOW,
    APTITUDE_HIGH: APTITUDE_HIGH,
    SEATING_COLS: SEATING_COLS,
    SEATING_ROWS: SEATING_ROWS,
    aptitudeTier: aptitudeTier,
    getDB: getDB,
    saveDB: saveDB,
    resetDB: resetDB,
    recordAttempt: recordAttempt,
    getCell: getCell,
  };
})(window);
