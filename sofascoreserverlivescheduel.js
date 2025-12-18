

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.static('.'));
app.use(express.json());

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.sofascore.com/',
  'Origin': 'https://www.sofascore.com'
};

// ✅ IN-MEMORY DATA
let LIVE_MATCHES = [];
let SCHEDULED_MATCHES = [];
let PREDICTIONS = [];

const CONFIG = { maxMatches: 20 };

// --- API ENDPOINTS ---

app.get('/api/all-matches', async (req, res) => {
  await fetchAllMatches();
  res.json({
    live: LIVE_MATCHES,
    scheduled: SCHEDULED_MATCHES,
    predictions: PREDICTIONS,
    stats: getStats()
  });
});

app.get('/api/test', async (req, res) => {
  try {
    const live = await fetch('https://api.sofascore.com/api/v1/sport/football/events/live', { headers: HEADERS });
    const data = await live.json();
    res.json({
      liveCount: data.events?.length || 0,
      sample: data.events?.slice(0, 2).map(e => ({
        league: e.tournament?.uniqueTournament?.name,
        teams: `${e.homeTeam?.name || 'TeamA'} vs ${e.awayTeam?.name || 'TeamB'}`
      }))
    });
  } catch(e) {
    res.json({ error: e.message });
  }
});

// --- FETCH FUNCTIONS ---

async function fetchAllMatches() {
  console.clear();
  console.log('🔥 Fetching matches...');

  LIVE_MATCHES = [];
  SCHEDULED_MATCHES = [];
  PREDICTIONS = [];

  await fetchLiveMatches();
  await fetchScheduledMatches();

  console.log(`✅ LIVE: ${LIVE_MATCHES.length} | SCHEDULED: ${SCHEDULED_MATCHES.length}`);
}

async function fetchLiveMatches() {
  try {
    const response = await fetch('https://api.sofascore.com/api/v1/sport/football/events/live', { headers: HEADERS });
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      data.events.slice(0, CONFIG.maxMatches).forEach(event => {
        const match = {
          match_id: event.id,
          league: getLeagueName(event),
          home_team: event.homeTeam?.name || 'Home',
          away_team: event.awayTeam?.name || 'Away',
          status: 'LIVE',
          home_score: event.homeScore?.current || 0,
          away_score: event.awayScore?.current || 0,
          minute: event.minute || 0,
          time: formatPKT(event.startTimestamp)
        };

        LIVE_MATCHES.push(match);
        PREDICTIONS.push({
          match_id: match.match_id,
          over_25: '78%',
          confidence: 85
        });
      });
    }
  } catch(e) {
    console.log('❌ Live fetch failed');
  }
}

async function fetchScheduledMatches() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}/inverse`;

  try {
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      // ✅ Filter top leagues + World Cup qualifiers
      const topLeagues = [
        'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
        'Eredivisie', 'Primeira Liga', 'Russian Premier League', 'Super Lig',
        'Belgian Pro League', 'Scottish Premiership', 'Ukrainian Premier League',
        'Saudi Professional League', 'Qatar Stars League', 'J1 League'
      ];

      const filtered = data.events.filter(e => {
        const leagueName = e.tournament?.uniqueTournament?.name || '';
        const isWorldCupQualifier = e.tournament?.category?.name?.includes('World Cup') || false;
        return topLeagues.includes(leagueName) || isWorldCupQualifier;
      });

      filtered.slice(0, CONFIG.maxMatches).forEach(event => {
        const match = {
          match_id: event.id,
          league: event.tournament?.uniqueTournament?.name || 'League',
          home_team: event.homeTeam?.name || 'Home',
          away_team: event.awayTeam?.name || 'Away',
          status: 'SCHEDULED',
          home_score: 0,
          away_score: 0,
          time: formatPKT(event.startTimestamp)
        };

        SCHEDULED_MATCHES.push(match);
        PREDICTIONS.push({
          match_id: match.match_id,
          over_25: '65%',
          confidence: 75
        });
      });
    }
  } catch(e) {
    console.log('❌ Scheduled fetch failed', e.message);
  }
}

// --- HELPERS ---

function getLeagueName(event) {
  const country = event.tournament?.category?.country?.name || 'World';
  const league = event.tournament?.uniqueTournament?.name || 'League';
  const flags = {
    'England': '🏴', 'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Italy': '🇮🇹'
  };
  return `${flags[country] || '⚽'} ${league}`;
}

function formatPKT(timestamp) {
  try {
    return new Date(timestamp * 1000).toLocaleTimeString('pk-PK', { hour: '2-digit', minute: '2-digit' });
  } catch(e) {
    return '00:00';
  }
}

function getStats() {
  return {
    liveMatches: LIVE_MATCHES.length,
    scheduledMatches: SCHEDULED_MATCHES.length,
    total: LIVE_MATCHES.length + SCHEDULED_MATCHES.length
  };
}

// --- AUTO REFRESH ---
setInterval(fetchAllMatches, 60000);
fetchAllMatches();

// --- START SERVER ---
app.listen(8080, () => {
  console.log('\n🚀 SERVER RUNNING!');
  console.log('🧪 TEST: http://localhost:8080/api/test');
  console.log('📱 FRONTEND: http://localhost:8080');
  console.log('🔗 API: http://localhost:8080/api/all-matches');
});
