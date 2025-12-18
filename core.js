
export function getLeagueFactor(league) {
  const factors = {
    'Dhaka Senior Division League': 2, 'Mumbai Super League': 2,
    'Premier League': 4, 'Bundesliga': 6, 'Serie A': 1
  };
  return factors[league] || 2;
}

export function realPredict(match) {
  const homeScore = parseInt(match.home_score) || 0;
  const awayScore = parseInt(match.away_score) || 0;
  const totalGoals = homeScore + awayScore;
  const minute = parseInt(match.minute) || 45;
  const leagueFactor = getLeagueFactor(match.league_name || '');
  
  return {
    match_id: match.match_id,
    home_team: match.home_team,
    away_team: match.away_team,
    score: `${homeScore}-${awayScore}`,
    minute: minute,
    status: 'LIVE',
    league: match.league,
    intensity: Math.round(minute + leagueFactor * 10),
    over_05: totalGoals > 0 ? 92 : 78,
    over_15: totalGoals > 1 ? 88 : 68,
    over_25: Math.min(92, 60 + minute * 0.3),
    btts: totalGoals > 1 ? 82 : 58,
    confidence: Math.min(90, 75 + (minute / 90) * 15)
  };
}

export function getFlag(country) {
  const flags = {
    'Bangladesh': '🇧🇩', 'India': '🇮🇳', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  };
  return flags[country] || '⚽';
}

export function formatPKT(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString('pk-PK', { 
    hour: '2-digit', minute: '2-digit' 
  });
}
