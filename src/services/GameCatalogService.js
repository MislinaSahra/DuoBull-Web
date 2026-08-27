import { supabase } from "../lib/supabase.js";
import { GAME_NAMES, getCharactersForGame, getRolesForGame } from "../constants/GameConstants.js";
import { rankMappings } from "../data/mockData.js";

const fallback = GAME_NAMES.map((name, index) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, roles: getRolesForGame(name), ranks: rankMappings[name] || [], characters: getCharactersForGame(name), team_size: 5, is_active: true, sort_order: (index + 1) * 10 }));
const asList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};
const normalize = (item) => ({ ...item, roles: asList(item?.roles), ranks: asList(item?.ranks), characters: asList(item?.characters), team_size: Math.max(1, Number(item?.team_size || 5)) });

export async function fetchGameCatalog() {
  const { data, error } = await supabase.from("game_catalog").select("*").order("sort_order").order("name");
  if (error) return fallback;
  return (data?.length ? data : fallback).map(normalize);
}
export async function saveGameCatalog(game) {
  const payload = { id: game.id || game.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name: game.name.trim(), roles: game.roles, ranks: game.ranks, characters: game.characters, team_size: Math.max(1, Number(game.team_size || 5)), is_active: game.is_active !== false, sort_order: Number(game.sort_order || 0), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("game_catalog").upsert(payload).select().single();
  return error ? { ok: false, message: error.message } : { ok: true, game: normalize(data) };
}
export async function deleteGameCatalog(id) { const { error } = await supabase.from("game_catalog").delete().eq("id", id); return error ? { ok: false, message: error.message } : { ok: true }; }
export function subscribeToGameCatalog(listener) { const channel = supabase.channel("game-catalog-live").on("postgres_changes", { event: "*", schema: "public", table: "game_catalog" }, listener).subscribe(); return () => supabase.removeChannel(channel); }
