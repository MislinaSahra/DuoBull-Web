import { supabase } from "../lib/supabase.js";
import { removeStoredImage, uploadPublicImage } from "../lib/storageImages.js";

export async function fetchTeamProfile(id) {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id,name,game,region,status,captain_id,logo_url,banner_url,motto,profile_description,team_size,reserve_enabled,reserve_size,created_at")
    .eq("id", id)
    .maybeSingle();
  if (teamError) return { error: teamError.message };
  if (!team) return { error: "Takım bulunamadı veya bu profili görme yetkiniz yok." };

  const { data: members, error: memberError } = await supabase
    .from("team_members")
    .select("user_id,member_role,rank,roster_type,profiles!team_members_user_id_fkey(username,avatar_url,is_verified)")
    .eq("team_id", id)
    .order("joined_at");

  return {
    ...team,
    team_members: (members || []).map((member) => ({ ...member, role: member.member_role })),
    rosterError: memberError?.message || "",
  };
}

export async function saveTeamProfile(id, values) {
  const { data, error } = await supabase.rpc("save_team_profile", {
    target_team: id,
    next_logo_url: values.logo_url || "",
    next_banner_url: values.banner_url || "",
    next_motto: values.motto || "",
    next_description: values.profile_description || "",
  });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, team: Array.isArray(data) ? data[0] : data };
}

export async function uploadTeamAsset(teamId, file, kind) {
  if (kind !== "banner") {
    return { ok: false, message: "Takım logoları yalnızca yöneticilerin eklediği hazır seçeneklerden seçilebilir." };
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  const userId = sessionData?.user?.id;
  if (sessionError || !userId) {
    return { ok: false, message: "Görsel yüklemek için yeniden giriş yapmanız gerekiyor." };
  }

  const attempts = [
    { bucket: "team-assets", prefix: `${userId}/${teamId}` },
    { bucket: "profile-banners", prefix: `${userId}/teams/${teamId}` },
  ];

  for (const attempt of attempts) {
    try {
      const uploaded = await uploadPublicImage({
        ...attempt,
        label: kind,
        file,
      });
      return { ok: true, ...uploaded };
    } catch (error) {
      const canFallback = /row-level security|policy/i.test(error.message);
      if (!canFallback || attempt === attempts.at(-1)) {
        return { ok: false, message: `Görsel yüklenemedi: ${error.message}` };
      }
    }
  }
  return { ok: false, message: "Görsel yüklenemedi." };
}

export async function removeTeamAsset(url) {
  await removeStoredImage(url, ["team-assets", "profile-banners"]);
}
