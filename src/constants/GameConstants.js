export const GAMES = [
  { id: "valorant", name: "Valorant" },
  { id: "pubg-mobile", name: "PUBG Mobile" },
  { id: "free-fire", name: "Free Fire" },
  { id: "league-of-legends", name: "League of Legends" },
  { id: "counter-strike-2", name: "Counter-Strike 2" },
  { id: "fortnite", name: "Fortnite" }
];
export const GAME_NAMES = GAMES.map((game) => game.name);

export const GAME_ROLE_MAPPINGS = {
  Valorant: ["Düellocu", "Öncü", "Kontrol Uzmanı", "Gözcü"],
  "PUBG Mobile": ["Hücumcu", "Destek", "Keskin Nişancı", "Takım Lideri (IGL)"],
  "Free Fire": ["Hücumcu", "Destek", "Keskin Nişancı", "Takım Lideri (IGL)"],
  "League of Legends": ["Üst Koridor", "Ormancı", "Orta Koridor", "Alt Koridor", "Destek"],
  "Counter-Strike 2": ["Giriş Oyuncusu", "AWP Oyuncusu", "Destek", "Takım Lideri (IGL)", "Pusucu"],
  Fortnite: ["Takım Lideri (IGL)", "Hücumcu", "Destek", "Esnek"]
};

export function getRolesForGame(gameName) {
  return GAME_ROLE_MAPPINGS[gameName] || [];
}

export const GAME_CHARACTER_MAPPINGS = {
  Valorant: ["Astra","Breach","Brimstone","Chamber","Clove","Cypher","Deadlock","Fade","Gekko","Harbor","Iso","Jett","KAY/O","Killjoy","Neon","Omen","Phoenix","Raze","Reyna","Sage","Skye","Sova","Tejo","Viper","Vyse","Waylay","Yoru"],
  "League of Legends": ["Ahri","Akali","Ashe","Caitlyn","Darius","Ezreal","Garen","Jinx","Kai'Sa","Katarina","Lee Sin","Leona","Lux","Master Yi","Morgana","Riven","Thresh","Vayne","Yasuo","Yone","Zed"],
  "PUBG Mobile": ["Victor","Sara","Carlo","Andy","Anna","Riley","Sophia","Lorenzo"],
  "Free Fire": ["Alok","Chrono","Kelly","Hayato","K","Moco","Skyler","Wukong","Jota","Dimitri","Tatsuya"],
  "Counter-Strike 2": ["Ajan tercihi yok","Terörist ajanı","Anti-Terörist ajanı"],
  Fortnite: ["Jonesy","Peely","Fishstick","Midas","Lynx","Raven","Drift","Meowscles","Aura","Ramirez"]
};

export function getCharactersForGame(gameName) { return GAME_CHARACTER_MAPPINGS[gameName] || []; }
