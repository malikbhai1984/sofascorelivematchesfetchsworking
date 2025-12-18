


import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { CONFIG, MATCHES, PREDICTIONS } from './config.js';
import { realPredict, getFlag, formatPKT, getLeagueFactor } from './core.js';

const app = express();
app.use(cors());
app.use(express.static('.'));
app.use(express.json());

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.sofascore.com/',
  'Origin': 'https://www.sofascore.com',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'Cache-Control': 'no-cache'
};

app.get('/api/matches', async (req, res) => {
  await fetchMatches();
  res.json({ matches: MATCHES, predictions: PREDICTIONS, stats: getStats() });
});

app.get('/api/debug', async (req, res) => {
  try {
    const response = await fetch('https://api.sofascore.com/api/v1/sport/football/events/live', { headers: HEADERS });
    const data = await response.json();
    res.json({
      status: response.status,
      count: data.events?.length || 0,
      firstMatch: data.events?.[0] ? {
        id: data.events[0].id,
        home: data.events[0].homeTeam?.name,
        away: data.events[0].awayTeam?.name,
        score: `${data.events[0].homeScore?.current || 0}-${data.events[0].awayScore?.current || 0}`
      } : null
    });
  } catch(e) {
    res.json({ error: e.message });
  }
});

async function fetchMatches() {
  MATCHES.length = 0;
  PREDICTIONS.length = 0;
  
  console.log('🔥 Fetching LIVE matches...');
  
  try {
    const response = await fetch('https://api.sofascore.com/api/v1/sport/football/events/live', { 
      headers: HEADERS 
    });
    
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`📡 Found ${data.events?.length || 0} events`);
    
    if (data.events && data.events.length > 0) {
      data.events.slice(0, CONFIG.maxMatches).forEach(event => {
        const match = {
          match_id: event.id,
          league: `${getFlag(event.tournament?.category?.country?.name || 'World')} ${event.tournament?.uniqueTournament?.name || event.tournament?.name || 'League'}`,
          league_name: event.tournament?.uniqueTournament?.name || event.tournament?.name || 'League',
          home_team: event.homeTeam?.name || 'Home',
          away_team: event.awayTeam?.name || 'Away',
          status: 'LIVE',
          home_score: event.homeScore?.current || 0,
          away_score: event.awayScore?.current || 0,
          minute: event.status?.type === 'inprogress' ? 45 : 0,
          time: formatPKT(event.startTimestamp),
          statistics: {}
        };
        
        if (!MATCHES.some(m => m.match_id === match.match_id)) {
          MATCHES.push(match);
          const pred = realPredict(match);
          if (pred) PREDICTIONS.push(pred);
        }
      });
      console.log(`✅ Added ${MATCHES.length} matches`);
    }
  } catch(error) {
    console.error('❌ Error:', error.message);
  }
}

function getStats() {
  return {
    totalMatches: MATCHES.length,
    liveMatches: MATCHES.filter(m => m.status === 'LIVE').length,
    predictions: PREDICTIONS.length
  };
}

// Start server
setInterval(fetchMatches, CONFIG.refreshInterval);
fetchMatches();

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`\n🚀 Server LIVE: http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/matches`);
  console.log(`🧪 Debug: http://localhost:${PORT}/api/debug`);
  console.log('═'.repeat(50));
});
