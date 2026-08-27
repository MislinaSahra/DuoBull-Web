import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { productOptions } from "../data/mockData.js";
import { useAuth } from "./AuthContext.jsx";
import { fetchPlatformData, platformApi, subscribeToPlatformChanges } from "../services/PlatformService.js";
import { fetchProducts, subscribeToProducts, updateProductStock as saveProductStock } from "../services/ProductService.js";

const AdminOperationsContext = createContext(null);
const STORAGE_KEY = "duobull.admin.management.clean";

const defaults = {
  teams: [
    { id: "team-1", name: "Shadow Legends", players: ["Mert", "Ece", "Arda", "Selin"], game: "Valorant", appliedAt: "14 Tem 2026, 18:42", status: "pending" },
    { id: "team-2", name: "Anka Tactics", players: ["Can", "Deniz", "Bora", "İpek", "Emir"], game: "Counter-Strike 2", appliedAt: "14 Tem 2026, 20:16", status: "pending" },
    { id: "team-3", name: "Storm Builders", players: ["Ada", "Kerem", "Naz"], game: "Fortnite", appliedAt: "15 Tem 2026, 09:05", status: "pending" }
  ],
  stock: 318,
  stockByTarget: { tournament: 0, shop: 318 },
  stockByProduct: { "Google Play": 80, "App Store": 65, "Razer Gold": 72, "Valorant VP": 101, "PUBG Mobile": 55 },
  stockTransactions: [],
  tournamentRegistrations: [],
  teamApplications: [],
  tournamentApplications: [],
  tournamentRequests: [],
  reports: [
    { id: "report-1", subject: "Nova Alliance oyuncu raporu", status: "open" },
    { id: "report-2", subject: "Turnuva sohbeti bildirimi", status: "open" }
  ],
  tournaments: 126,
  tournamentDrafts: [
    { id: "draft-1", name: "DuoBull Valorant Series", game: "Valorant", date: "2026-07-23", prize: "₺75.000", participantLimit: 128, status: "draft" },
    { id: "draft-2", name: "DuoBull CS2 Masters", game: "Counter-Strike 2", date: "2026-07-27", prize: "₺90.000", participantLimit: 32, status: "draft" },
    { id: "draft-3", name: "DuoBull Fortnite Clash", game: "Fortnite", date: "2026-07-29", prize: "₺60.000", participantLimit: 100, status: "draft" }
  ]
};

function readState() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const merged = { ...defaults, ...stored };
    const teamApplications = stored.teamApplications || [];
    const legacyDates = { "23 Tem 2026": "2026-07-23", "27 Tem 2026": "2026-07-27", "29 Tem 2026": "2026-07-29" };
    const teams = merged.teams.map((team) => {
      const members = team.members || team.players.map((name, index) => ({ name, email: index === 0 ? team.captainEmail : "", role: index === 0 ? "Kaptan" : "Oyuncu", rank: team.level || "Belirtilmedi", game: team.game }));
      const approvedApplications = teamApplications.filter((application) => application.status === "approved" && (application.teamId === team.id || application.teamName === team.name));

      return approvedApplications.reduce((current, application) => {
        const hasPlayer = current.players.includes(application.applicantName);
        const hasMember = current.members.some((member) => (application.applicantEmail && member.email === application.applicantEmail) || member.name === application.applicantName);
        return {
          ...current,
          players: hasPlayer ? current.players : [...current.players, application.applicantName],
          members: hasMember ? current.members : [...current.members, { name: application.applicantName, email: application.applicantEmail, role: application.playerRole || current.role || "Oyuncu", rank: application.rank || current.level || "Belirtilmedi", game: application.game || current.game }]
        };
      }, { ...team, members });
    });
    const repairedState = {
      ...merged,
      teams,
      stockByTarget: { ...defaults.stockByTarget, ...(stored.stockByTarget || {}) },
      stockByProduct: { ...defaults.stockByProduct, ...(stored.stockByProduct || {}) },
      stockTransactions: stored.stockTransactions || [],
      tournamentRegistrations: stored.tournamentRegistrations || [],
      teamApplications,
      tournamentApplications: stored.tournamentApplications || [],
      tournamentRequests: stored.tournamentRequests || [],
      tournamentDrafts: merged.tournamentDrafts.map((draft) => ({ ...draft, date: legacyDates[draft.date] || draft.date, participantLimit: draft.participantLimit || 64 }))
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(repairedState));
    return repairedState;
  }
  catch { return defaults; }
}

export function AdminOperationsProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(() => ({ ...readState(), teams: [], stock: 0, stockByTarget: { tournament: 0, shop: 0 }, stockByProduct: {}, reports: [], tournaments: 0, teamApplications: [], tournamentApplications: [], tournamentRequests: [], tournamentDrafts: [] }));
  const save = (updater) => setState((current) => {
    const next = typeof updater === "function" ? updater(current) : updater;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });
  const refreshPlatform = useCallback(async () => {
    if (!user) return;
    try {
      const platform = await fetchPlatformData();
      setState((current) => ({ ...current, ...platform }));
    } catch (error) {
      console.error("Platform verileri yüklenemedi:", error.message);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setState((current) => ({ ...current, teams: [], teamApplications: [], tournamentApplications: [], tournamentRequests: [], tournamentDrafts: [] }));
      return undefined;
    }
    refreshPlatform();
    return subscribeToPlatformChanges(refreshPlatform);
  }, [refreshPlatform, user]);
  const refreshProducts = useCallback(async () => {
    if (!user) return {};
    const products = await fetchProducts();
    const stockByProduct = Object.fromEntries(products.map((product) => [product.name, product.stockCount]));
    setState((current) => ({ ...current, stockByProduct, stock: products.reduce((sum, product) => sum + product.stockCount, 0) }));
    return stockByProduct;
  }, [user]);
  useEffect(() => {
    if (!user) return undefined;
    refreshProducts();
    return subscribeToProducts(refreshProducts, "admin-products-live");
  }, [refreshProducts, user]);

  const value = useMemo(() => ({
    ...state,
    pendingTeams: state.teams.filter((team) => team.status === "pending"),
    activeTeams: state.teams.filter((team) => team.status === "approved"),
    publishedTournaments: state.tournamentDrafts.filter((tournament) => tournament.status === "published"),
    featuredTournaments: state.tournamentDrafts.filter((tournament) => tournament.status === "published" && tournament.isFeatured === true),
    openReports: state.reports.filter((report) => report.status === "open"),
    draftTournaments: state.tournamentDrafts.filter((tournament) => tournament.status === "draft"),
    async fetchPublishedTournaments() { return state.tournamentDrafts.filter((tournament) => tournament.status === "published"); },
    async submitTournamentApplication(data) { if (!user) return { ok: false, message: "Başvuru için giriş yapmalısın." }; if (!data.ownerEmail) return { ok: false, message: "Bu turnuva için yönetici kaptan tanımlı değil." }; if (data.ownerId === user.id || data.ownerEmail === user.email) return { ok: false, message: "Kendi turnuvana başvuramazsın." }; const existing = state.tournamentApplications.find((item) => item.tournamentId === data.tournamentId && (item.userId === user.id || item.userEmail === user.email) && ["pending", "approved"].includes(item.status)); if (existing) return { ok: false, message: existing.status === "approved" ? "Bu turnuvaya zaten katılıyorsun." : "Bu turnuva için bekleyen bir başvurun var." }; const { data: created, error } = await platformApi.applyTournament(data, user.id); if (error) return { ok: false, message: error.message }; await refreshPlatform(); return { ok: true, application: created }; },
    async checkInTournament(applicationId) { const { data, error } = await platformApi.checkInTournament(applicationId); if (error) return { ok: false, message: error.message }; await refreshPlatform(); return { ok: true, application: data }; },
    async saveTournamentManagement(id, data) { const { data: saved, error } = await platformApi.saveTournamentManagement(id, data); if (error) return { ok: false, message: error.message }; await refreshPlatform(); return { ok: true, tournament: saved }; },
    async generateTournamentBracket(id) { const { data, error } = await platformApi.generateTournamentBracket(id); if (error) return { ok: false, message: error.message }; return { ok: true, matches: data }; },
    async fetchTournamentMatches(id) { const { data, error } = await platformApi.fetchTournamentMatches(id); return error ? [] : (data || []); },
    async saveTournamentMatch(id,data) { const {data:saved,error}=await platformApi.saveTournamentMatch(id,data); return error?{ok:false,message:error.message}:{ok:true,match:saved}; },
    async recordTournamentMatchResult(id,data) { const {data:saved,error}=await platformApi.recordTournamentMatchResult(id,data); return error?{ok:false,message:error.message}:{ok:true,match:saved}; },
    async submitTournamentMapVeto(matchId,mapName,action) { const {data:saved,error}=await platformApi.submitTournamentMapVeto(matchId,mapName,action); return error?{ok:false,message:error.message}:{ok:true,veto:saved}; },
    async uploadTournamentEvidence(matchId,teamId,file) { const {data:saved,error}=await platformApi.uploadTournamentEvidence(matchId,teamId,file); return error?{ok:false,message:error.message}:{ok:true,match:saved}; },
    reviewTournamentApplication(id, status) { save((current) => ({ ...current, tournamentApplications: current.tournamentApplications.map((item) => item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item) })); platformApi.reviewTournamentApplication(id, status).then(refreshPlatform); },
    async deleteTournamentApplication(id) { const { error } = await platformApi.deleteTournamentApplication(id); if (error) return { ok: false, message: error.message }; await refreshPlatform(); return { ok: true }; },
    leaveTournament(id, userEmail) { save((current) => ({ ...current, tournamentApplications: current.tournamentApplications.map((item) => item.id === id && item.userEmail === userEmail ? { ...item, status: "withdrawn", leftAt: new Date().toISOString() } : item) })); platformApi.withdrawTournamentApplication(id).then(refreshPlatform); },
    dismissTournamentApplication(id, userEmail) { save((current) => ({ ...current, tournamentApplications: current.tournamentApplications.map((item) => item.id === id && item.userEmail === userEmail ? { ...item, hiddenForApplicant: true } : item) })); platformApi.hideTournamentApplication(id).then(refreshPlatform); },
    async submitTournamentRequest(data) {
      if (!user) return { ok: false, message: "Turnuva oluşturmak için giriş yapmalısın." };
      const { data: created, error } = await platformApi.createTournamentRequest(data, user.id);
      if (error) return { ok: false, message: error.message };
      await refreshPlatform();
      return { ok: true, request: created };
    },
    async reviewTournamentRequest(id, status) {
      const { data, error } = await platformApi.reviewTournamentRequest(id, status);
      if (error) return { ok: false, message: error.message };
      await refreshPlatform();
      return { ok: true, tournamentId: data };
    },
    async createTeam(team) { if (!user) return { ok: false, message: "Takım oluşturmak için giriş yapmalısın." }; const { error } = await platformApi.createTeam(team, user.id); if (error) return { ok: false, message: error.code === "23505" ? "Bu takım adı kullanılıyor. Farklı bir takım adı seçin." : error.message }; await refreshPlatform(); return { ok: true }; },
    updateTeam(id, updates, captainEmail) { save((current) => ({ ...current, teams: current.teams.map((team) => team.id === id && team.captainEmail === captainEmail ? { ...team, role: updates.role ?? team.role, level: updates.level ?? team.level, region: updates.region ?? team.region, description: updates.description ?? team.description, members: team.members.map((member) => member.email === captainEmail ? { ...member, rank: updates.level ?? team.level } : member) } : team) })); platformApi.updateTeam(id, updates).then(refreshPlatform); },
    removeTeamMember(teamId, memberId, captainEmail) { save((current) => ({ ...current, teams: current.teams.map((team) => team.id === teamId && team.captainEmail === captainEmail && memberId !== captainEmail ? { ...team, members: team.members.filter((member) => member.email !== memberId && member.name !== memberId), players: team.players.filter((player) => player !== memberId && !team.members.some((member) => (member.email === memberId || member.name === memberId) && member.name === player)) } : team) })); },
    async submitTeamApplication(data) {
      if (!user) return { ok: false, message: "Başvuru için giriş yapmalısın." };
      const team = state.teams.find((item) => item.id === data.teamId);
      if (!team) return { ok: false, message: "Takım bulunamadı." };
      if (team.captainId === user.id || team.captainEmail === user.email) return { ok: false, message: "Kendi takımına başvuramazsın." };
      if ((team.members || []).some((member) => member.userId === user.id || member.email === user.email)) return { ok: false, message: "Zaten bu takımın üyesisin." };
      if (state.teamApplications.some((item) => item.teamId === team.id && item.applicantId === user.id && ["pending", "approved"].includes(item.status))) return { ok: false, message: "Bu takım için zaten aktif bir başvurun var." };
      const { data: created, error } = await platformApi.applyTeam(data, user.id);
      if (error) return { ok: false, message: error.code === "23505" ? "Bu takıma daha önce başvurdun." : error.message };
      await refreshPlatform();
      return { ok: true, application: created };
    },
    reviewTeamApplication(id, status) { save((current) => ({ ...current, teamApplications: current.teamApplications.map((item) => item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item) })); platformApi.reviewTeamApplication(id, status).then(refreshPlatform); },
    approveTeam(id) { save((current) => ({ ...current, teams: current.teams.map((team) => team.id === id ? { ...team, status: "approved", approvedAt: new Date().toISOString() } : team) })); platformApi.reviewTeam(id, "approved").then(refreshPlatform); },
    deleteTeam(id) { save((current) => ({ ...current, teams: current.teams.filter((team) => team.id !== id), tournamentRegistrations: current.tournamentRegistrations.filter((registration) => registration.teamId !== id) })); platformApi.deleteTeam(id).then(refreshPlatform); return { ok: true, id }; },
    async leaveTeam(id, userEmail) { const team = state.teams.find((item) => item.id === id); if (!team || !user) return { ok: false, message: "Takım bulunamadı." }; const response = team.captainEmail === userEmail ? await platformApi.deleteTeam(id) : await platformApi.leaveTeam(id, user.id); if (response.error) return { ok: false, message: response.error.message }; await refreshPlatform(); return { ok: true }; },
    deleteTeamApplication(id, userEmail) { save((current) => ({ ...current, teamApplications: current.teamApplications.filter((item) => !(item.id === id && item.applicantEmail === userEmail)) })); },
    dismissTeamApplication(id, userEmail) { save((current) => ({ ...current, teamApplications: current.teamApplications.map((item) => item.id === id && item.applicantEmail === userEmail ? { ...item, hiddenForApplicant: true } : item) })); platformApi.hideTeamApplication(id).then(refreshPlatform); },
    reviewTeam(id, status) { save((current) => ({ ...current, teams: current.teams.map((team) => team.id === id ? { ...team, status, reviewedAt: new Date().toISOString() } : team) })); platformApi.reviewTeam(id, status).then(refreshPlatform); },
    addStock(amount, target) { save((current) => ({ ...current, stock: current.stock + amount, stockByTarget: { ...current.stockByTarget, [target]: (current.stockByTarget?.[target] || 0) + amount }, stockTransactions: [...(current.stockTransactions || []), { id: `stock-${Date.now()}`, amount, target, createdAt: new Date().toISOString() }] })); },
    adjustProductStock(product, amount, operation) {
      const currentCount = state.stockByProduct[product] || 0;
      if (operation === "remove" && amount > currentCount) return { ok: false, message: `${product} için yeterli stok yok.` };
      const delta = operation === "add" ? amount : -amount;
      save((current) => ({ ...current, stock: Math.max(0, current.stock + delta), stockByProduct: { ...current.stockByProduct, [product]: (current.stockByProduct[product] || 0) + delta }, stockTransactions: [...(current.stockTransactions || []), { id: `stock-${Date.now()}`, product, amount, operation, createdAt: new Date().toISOString() }] }));
      return { ok: true, product, stockCount: currentCount + delta };
    },
    async updateProductStock(productId, amount) {
      const product = productOptions.find((item) => item.id === productId);
      if (!product) return { ok: false, message: "Ürün bulunamadı." };
      const result = await saveProductStock(productId, amount);
      if (!result.ok) return result;
      await refreshProducts();
      const response = { ...result, product: product.name };
      console.log("Ürün stok güncelleme yanıtı:", response);
      return response;
    },
    refreshStock() { return refreshProducts(); },
    closeReport(id) { save((current) => ({ ...current, reports: current.reports.map((report) => report.id === id ? { ...report, status: "closed" } : report) })); },
    createTournamentDraft(tournament) { save((current) => ({ ...current, tournamentDrafts: [...current.tournamentDrafts, { ...tournament, id: `pending-${Date.now()}`, status: "draft", createdAt: new Date().toISOString() }] })); platformApi.createTournament(tournament, user?.id).then(refreshPlatform); },
    updateTournamentDraft(id, updates) { save((current) => ({ ...current, tournamentDrafts: current.tournamentDrafts.map((tournament) => tournament.id === id ? { ...tournament, ...updates } : tournament) })); platformApi.updateTournament(id, updates).then(refreshPlatform); },
    deleteTournament(id) { save((current) => ({ ...current, tournaments: Math.max(0, current.tournaments - 1), tournamentDrafts: current.tournamentDrafts.filter((tournament) => tournament.id !== id) })); platformApi.deleteTournament(id).then(refreshPlatform); return { ok: true, id }; },
    setTournamentFeatured(id, isFeatured) { save((current) => ({ ...current, tournamentDrafts: current.tournamentDrafts.map((tournament) => tournament.id === id ? { ...tournament, isFeatured } : tournament) })); platformApi.updateTournament(id, { isFeatured }).then(refreshPlatform); return { ok: true, id, isFeatured }; },
    publishTournament(id) {
      const tournament = state.tournamentDrafts.find((item) => item.id === id);
      if (!tournament) return { ok: false, message: "Turnuva taslağı bulunamadı." };
      const publishedAt = new Date().toISOString();
      save((current) => ({ ...current, tournaments: current.tournaments + 1, tournamentDrafts: current.tournamentDrafts.map((item) => item.id === id ? { ...item, status: "published", publishedAt } : item) }));
      platformApi.updateTournament(id, { status: "published", publishedAt }).then(refreshPlatform);
      const response = { ok: true, id, name: tournament.name, status: "published", publishedAt };
      console.log("Turnuva yayınlama yanıtı:", response);
      return response;
    }
  }), [refreshPlatform, refreshProducts, state, user]);

  return <AdminOperationsContext.Provider value={value}>{children}</AdminOperationsContext.Provider>;
}

export function useAdminOperations() {
  const context = useContext(AdminOperationsContext);
  if (!context) throw new Error("useAdminOperations must be used inside AdminOperationsProvider");
  return context;
}
