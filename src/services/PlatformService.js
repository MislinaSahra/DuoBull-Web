import { supabase } from "../lib/supabase.js";
import { uploadPublicImage } from "../lib/storageImages.js";

const prizeText = (value) => `₺${Number(value || 0).toLocaleString("tr-TR")}`;

export async function fetchPlatformData() {
  const [profilesResult, teamsResult, membersResult, teamAppsResult, requestsResult, tournamentsResult, tournamentAppsResult] = await Promise.all([
    supabase.from("profiles").select("id,email,username,game,player_role,rank,avatar_url"),
    supabase.from("teams").select("*").order("created_at", { ascending: false }),
    supabase.from("team_members").select("*"),
    supabase.from("team_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("tournament_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
    supabase.from("tournament_applications").select("*").order("created_at", { ascending: false })
  ]);

  const error = [profilesResult, teamsResult, membersResult, teamAppsResult, requestsResult, tournamentsResult, tournamentAppsResult].find((result) => result.error)?.error;
  if (error) throw error;

  const profiles = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  const teams = teamsResult.data.map((team) => {
    const captain = profiles.get(team.captain_id);
    const members = membersResult.data.filter((member) => member.team_id === team.id).map((member) => {
      const profile = profiles.get(member.user_id);
      return { id: member.user_id, userId: member.user_id, name: profile?.username || "Oyuncu", email: profile?.email || "", avatar: profile?.avatar_url || "", role: member.member_role || profile?.player_role, rank: member.rank || profile?.rank, rosterType: member.roster_type || "main", game: team.game };
    });
    return {
      id: team.id, name: team.name, game: team.game, role: team.wanted_role, level: team.level, region: team.region,
      contact: team.contact, description: team.description, status: team.status, captainId: team.captain_id,
      captain: captain?.username || "Kaptan", captainEmail: captain?.email || "", members, logoUrl: team.logo_url || "", teamSize: Number(team.team_size || 5), wantedRoles: team.wanted_roles || [], reserveEnabled: Boolean(team.reserve_enabled), reserveSize: Number(team.reserve_size || 0),
      players: members.map((member) => member.name), appliedAt: new Date(team.created_at).toLocaleString("tr-TR"), createdAt: team.created_at
    };
  });

  const teamApplications = teamAppsResult.data.map((application) => {
    const applicant = profiles.get(application.applicant_id);
    const team = teams.find((item) => item.id === application.team_id);
    return {
      id: application.id, teamId: application.team_id, teamName: team?.name || "Takım", captainEmail: team?.captainEmail || "",
      applicantId: application.applicant_id, applicantEmail: applicant?.email || "", applicantName: applicant?.username || "Oyuncu",
      playerRole: application.player_role, rank: application.rank, game: applicant?.game || team?.game, note: application.note || "", availability: application.availability || "", contact: application.contact || "",
      status: application.status, hiddenForApplicant: application.hidden_for_applicant, createdAt: application.created_at
    };
  });

  const tournamentDrafts = tournamentsResult.data.map((tournament) => {
    const owner = profiles.get(tournament.owner_id);
    return {
      id: tournament.id, name: tournament.name, game: tournament.game, prize: prizeText(tournament.prize),
      date: tournament.tournament_date, startsAt: tournament.starts_at, participantLimit: tournament.participant_limit, description: tournament.description, rules: tournament.rules || "", region: tournament.region || "", gameMode: tournament.game_mode || "", entryFee: Number(tournament.entry_fee || 0), organizerContact: tournament.organizer_contact || "", streamUrl: tournament.stream_url || "", mapPool: tournament.map_pool || [], checkInOpensAt: tournament.check_in_opens_at, checkInClosesAt: tournament.check_in_closes_at, formatId: tournament.format_id, formatName: tournament.format_name || "Belirtilmedi",
      status: tournament.status, isFeatured: tournament.is_featured, ownerId: tournament.owner_id,
      ownerEmail: owner?.email || "", ownerName: owner?.username || "DuoBull Yönetimi", createdAt: tournament.created_at, publishedAt: tournament.published_at
    };
  });

  const tournamentRequests = requestsResult.data.map((request) => {
    const requester = profiles.get(request.requester_id);
    return {
      id: request.id, requesterId: request.requester_id, requesterEmail: requester?.email || "", requesterName: requester?.username || "Oyuncu",
      name: request.name, game: request.game, prize: prizeText(request.prize), date: request.tournament_date,
      participantLimit: request.participant_limit, formatId: request.format_id, formatName: request.format_name || "Belirtilmedi", status: request.status, createdAt: request.created_at
    };
  });

  const tournamentApplications = tournamentAppsResult.data.map((application) => {
    const applicant = profiles.get(application.applicant_id);
    const tournament = tournamentDrafts.find((item) => item.id === application.tournament_id);
    return {
      id: application.id, tournamentId: application.tournament_id, tournamentName: tournament?.name || "Turnuva", teamName: teams.find((item) => item.id === application.team_id)?.name || "",
      ownerEmail: tournament?.ownerEmail || "", ownerName: tournament?.ownerName || "", userId: application.applicant_id,
      userEmail: applicant?.email || "", userName: applicant?.username || "Oyuncu", playerRole: application.player_role,
      rank: application.rank, teamId: application.team_id, roster: application.roster || [], reserveId: application.reserve_id || null, checkedInAt: application.checked_in_at || null, status: application.status, hiddenForApplicant: application.hidden_for_applicant, createdAt: application.created_at
    };
  });

  return { teams, teamApplications, tournamentDrafts, tournamentRequests, tournamentApplications };
}

export function subscribeToPlatformChanges(onChange) {
  const channel = supabase.channel("platform-changes");
  ["teams", "team_members", "team_applications", "tournaments", "tournament_requests", "tournament_applications"].forEach((table) => {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  });
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

export const platformApi = {
  createTeam(data, userId) { return supabase.from("teams").insert({ captain_id: userId, name: data.name, game: data.game, wanted_role: data.role, wanted_roles: (data.wanted_roles || []).filter(Boolean), team_size: Math.max(1, Number(data.team_size || 5)), level: data.level, region: data.region, contact: data.contact || "", description: data.description || "", logo_url: data.logo_url || "", reserve_enabled: Boolean(data.reserve_enabled), reserve_size: data.reserve_enabled ? Math.max(1, Number(data.reserve_size || 1)) : 0 }).select().single(); },
  updateTeam(id, updates) { return supabase.from("teams").update({ wanted_role: updates.role, level: updates.level, region: updates.region, description: updates.description }).eq("id", id); },
  deleteTeam(id) { return supabase.from("teams").delete().eq("id", id); },
  reviewTeam(id, status) { return supabase.rpc("review_team", { team_id: id, decision: status }); },
  applyTeam(data, userId) { return supabase.from("team_applications").insert({ team_id: data.teamId, applicant_id: userId, player_role: data.playerRole, rank: data.rank, note: data.note || "", availability: data.availability || "", contact: data.contact || "" }).select().single(); },
  reviewTeamApplication(id, status) { return supabase.rpc("review_team_application", { application_id: id, decision: status }); },
  withdrawTeamApplication(id) { return supabase.rpc("withdraw_team_application", { application_id: id }); },
  hideTeamApplication(id) { return supabase.from("team_applications").update({ hidden_for_applicant: true }).eq("id", id); },
  removeTeamMember(teamId, userId) { return supabase.rpc("remove_team_member", { target_team_id: teamId, target_user_id: userId }); },
  leaveTeam(teamId, userId) { return supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId); },
  createTournamentRequest(data, userId) { return supabase.from("tournament_requests").insert({ requester_id: userId, name: data.name, game: data.game, prize: Number(String(data.prize).replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")) || 0, tournament_date: data.date, participant_limit: Number(data.participantLimit) || 64, format_id: data.formatId || null, format_name: data.formatName || "" }).select().single(); },
  reviewTournamentRequest(id, status) { return supabase.rpc("review_tournament_request", { request_id: id, decision: status }); },
  createTournament(data, userId = null) { return supabase.from("tournaments").insert({ owner_id: userId, name: data.name, game: data.game, prize: Number(String(data.prize).replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")) || 0, tournament_date: data.date, participant_limit: Number(data.participantLimit) || 64, format_id: data.formatId || null, format_name: data.formatName || "", status: "draft" }).select().single(); },
  updateTournament(id, data) { const updates = {}; if (data.date !== undefined) updates.tournament_date = data.date; if (data.prize !== undefined) updates.prize = Number(String(data.prize).replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".")) || 0; if (data.participantLimit !== undefined) updates.participant_limit = Number(data.participantLimit); if (data.formatId !== undefined) updates.format_id = data.formatId || null; if (data.formatName !== undefined) updates.format_name = data.formatName || ""; if (data.status !== undefined) updates.status = data.status; if (data.isFeatured !== undefined) updates.is_featured = data.isFeatured; if (data.description !== undefined) updates.description = data.description; if (data.publishedAt !== undefined) updates.published_at = data.publishedAt; return supabase.from("tournaments").update(updates).eq("id", id); },
  deleteTournament(id) { return supabase.from("tournaments").delete().eq("id", id); },
  applyTournament(data) { return supabase.rpc("apply_to_tournament",{target_tournament:data.tournamentId,target_team:data.teamId,selected_roster:data.roster||[],selected_reserve:data.reserveId||null}); },
  checkInTournament(applicationId) { return supabase.rpc("check_in_tournament",{target_application:applicationId}); },
  saveTournamentManagement(id, data) { return supabase.from("tournaments").update({ starts_at: data.startsAt || null, rules: data.rules || "", region: data.region || "", game_mode: data.gameMode || "", entry_fee: Number(data.entryFee || 0), organizer_contact: data.organizerContact || "", stream_url:data.streamUrl||"", map_pool:data.mapPool||String(data.mapPoolText||"").split(",").map(item=>item.trim()).filter(Boolean), check_in_opens_at: data.checkInOpensAt || null, check_in_closes_at: data.checkInClosesAt || null }).eq("id", id).select().single(); },
  generateTournamentBracket(id) { return supabase.rpc("generate_tournament_bracket", { target_tournament_id: id }); },
  async fetchTournamentMatches(id) { return supabase.from("tournament_matches").select("*").eq("tournament_id", id).order("round_no").order("match_no"); },
  saveTournamentMatch(id, data) { return supabase.from("tournament_matches").update({ scheduled_at:data.scheduledAt||null,server_ip:data.serverIp||"",server_password:data.serverPassword||"",lobby_code:data.lobbyCode||"",map_veto:data.mapVeto||"",status:data.status||"scheduled" }).eq("id",id).select().single(); },
  recordTournamentMatchResult(id, data) { return supabase.rpc("record_tournament_match_result",{target_match_id:id,new_score_a:Number(data.scoreA||0),new_score_b:Number(data.scoreB||0),new_status:data.status,new_ruling:data.ruling||""}); },
  submitTournamentMapVeto(matchId,mapName,action) { return supabase.rpc("submit_tournament_map_veto",{target_match:matchId,target_map:mapName,target_action:action}); },
  async uploadTournamentEvidence(matchId, teamId, file) { const uploaded=await uploadPublicImage({bucket:"match-results",prefix:teamId+"/tournaments",label:matchId,file}); return supabase.from("tournament_matches").update({evidence_url:uploaded.url}).eq("id",matchId).select().single(); },
  reviewTournamentApplication(id, status) { return supabase.rpc("review_tournament_application", { application_id: id, decision: status }); },
  deleteTournamentApplication(id) { return supabase.rpc("delete_tournament_application", { target_application_id: id }); },
  withdrawTournamentApplication(id) { return supabase.rpc("withdraw_tournament_application", { application_id: id }); },
  hideTournamentApplication(id) { return supabase.from("tournament_applications").update({ hidden_for_applicant: true }).eq("id", id); }
};
