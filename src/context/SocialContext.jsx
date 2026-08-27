import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import * as SocialService from "../services/SocialService.js";

const SocialContext = createContext(null);
const emptyState = { profiles: [], requests: [], friendships: [], direct: [], teams: [], tournaments: [], blocks: [], clears: [] };

const publicProfile = (profile) => ({
  id: profile.id, email: profile.email, name: profile.username, game: profile.game,
  playerRole: profile.player_role, rank: profile.rank, region: profile.region, avatar: profile.avatar_url,
  isVerified: Boolean(profile.is_verified),
  loyaltyXp: Number(profile.loyalty_xp || 0), mainCharacter: profile.main_character, usesMicrophone: profile.uses_microphone,
  playHours: profile.play_hours, playSchedule: profile.play_schedule
});

export function SocialProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(emptyState);

  const refresh = useCallback(async () => {
    if (!user?.id) return setState(emptyState);
    try { setState(await SocialService.fetchSocialData()); }
    catch (error) { console.error("Sosyal veriler yüklenemedi:", error.message); }
  }, [user?.id]);

  useEffect(() => {
    refresh();
    if (!user?.id) return undefined;
    const unsubscribe = SocialService.subscribeSocial(refresh);
    const fallback = window.setInterval(refresh, 3000);
    return () => { unsubscribe(); window.clearInterval(fallback); };
  }, [refresh, user?.id]);

  const value = useMemo(() => {
    const profileById = new Map(state.profiles.map((profile) => [profile.id, profile]));
    const profileByEmail = new Map(state.profiles.map((profile) => [profile.email, profile]));
    const allUsers = state.profiles.filter((profile) => profile.id !== user?.id).map(publicProfile);
    const myFriendships = state.friendships.filter((item) => item.user_one === user?.id || item.user_two === user?.id);
    const friendIds = myFriendships.map((item) => item.user_one === user?.id ? item.user_two : item.user_one);
    const friends = friendIds.map((id) => profileById.get(id)).filter(Boolean).map(publicProfile);
    const friendEmails = friends.map((friend) => friend.email);
    const requestView = (request) => {
      const sender = profileById.get(request.sender_id) || {};
      const receiver = profileById.get(request.receiver_id) || {};
      return { id: request.id, status: request.status, fromEmail: sender.email, fromName: sender.username || "Oyuncu", toEmail: receiver.email, toName: receiver.username || "Oyuncu", createdAt: request.created_at };
    };
    const friendRequests = state.requests.map(requestView);
    const incomingRequests = friendRequests.filter((item) => item.toEmail === user?.email && item.status === "pending");
    const outgoingRequests = friendRequests.filter((item) => item.fromEmail === user?.email && item.status === "pending");
    const mapMessage = (message, type, channelId) => {
      const sender = profileById.get(message.sender_id) || {};
      return { id: message.id, type, channelId, senderEmail: sender.email, senderName: sender.username || "Oyuncu", text: message.message, createdAt: message.created_at, deliveredAt: message.delivered_at, seenAt: message.seen_at };
    };
    const messages = [
      ...state.direct.filter((item) => { const otherId = item.sender_id === user?.id ? item.receiver_id : item.sender_id; const clear = state.clears.find((entry) => entry.user_id === user?.id && entry.other_user_id === otherId); return !clear || new Date(item.created_at) > new Date(clear.cleared_at); }).map((item) => mapMessage(item, "direct", [profileById.get(item.sender_id)?.email, profileById.get(item.receiver_id)?.email].sort().join("::"))),
      ...state.teams.map((item) => mapMessage(item, "team", item.team_id)),
      ...state.tournaments.map((item) => mapMessage(item, "tournament", item.tournament_id))
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return {
      friendRequests, friendships: myFriendships, messages, allUsers, friends, friendEmails, incomingRequests, outgoingRequests,
      isBlocked(friendEmail) { const friend = profileByEmail.get(friendEmail); return Boolean(friend && state.blocks.some((item) => item.blocker_id === user?.id && item.blocked_id === friend.id)); },
      isBlockedBy(friendEmail) { const friend = profileByEmail.get(friendEmail); return Boolean(friend && state.blocks.some((item) => item.blocker_id === friend.id && item.blocked_id === user?.id)); },
      async sendFriendRequest(target) {
        const targetProfile = profileByEmail.get(target.email);
        if (!targetProfile || friendIds.includes(targetProfile.id)) return { ok: false };
        try { await SocialService.sendFriendRequest(targetProfile.id); await refresh(); return { ok: true }; }
        catch (error) { return { ok: false, message: error.message }; }
      },
      async reviewFriendRequest(id, status) {
        try { await SocialService.reviewFriendRequest(id, status); await refresh(); return { ok: true }; }
        catch (error) { return { ok: false, message: error.message }; }
      },
      async removeFriend(friendEmail) {
        const friend = profileByEmail.get(friendEmail);
        if (!friend) return { ok: false };
        try { await SocialService.removeFriend(friend.id); await refresh(); return { ok: true }; }
        catch (error) { return { ok: false, message: error.message }; }
      },
      getDirectMessages(friendEmail) { const id = [user?.email, friendEmail].sort().join("::"); return messages.filter((item) => item.type === "direct" && item.channelId === id); },
      getChannelMessages(type, channelId) { return messages.filter((item) => item.type === type && item.channelId === channelId); },
      async sendDirectMessage(friendEmail, text) {
        const friend = profileByEmail.get(friendEmail); const cleanText = text.trim();
        if (!friend || !friendIds.includes(friend.id) || !cleanText) return { ok: false };
        try { await SocialService.sendDirectMessage(friend.id, cleanText); await refresh(); return { ok: true }; }
        catch (error) { return { ok: false, message: error.message }; }
      },
      async markDirectSeen(friendEmail) { const friend = profileByEmail.get(friendEmail); if (!friend) return; await SocialService.markDirectMessagesSeen(friend.id); await refresh(); },
      async setBlocked(friendEmail, blocked) { const friend = profileByEmail.get(friendEmail); if (!friend) return { ok: false }; try { await SocialService.setUserBlock(friend.id, blocked); await refresh(); return { ok: true }; } catch (error) { return { ok: false, message: error.message }; } },
      async clearConversation(friendEmail) { const friend = profileByEmail.get(friendEmail); if (!friend) return { ok: false }; try { await SocialService.clearDirectConversation(friend.id); await refresh(); return { ok: true }; } catch (error) { return { ok: false, message: error.message }; } },
      async sendChannelMessage(type, channelId, text) {
        const cleanText = text.trim(); if (!cleanText) return { ok: false };
        try { await SocialService.sendChannelMessage(type, channelId, cleanText); await refresh(); return { ok: true }; }
        catch (error) { return { ok: false, message: error.message }; }
      }
    };
  }, [state, user, refresh]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("useSocial must be used inside SocialProvider");
  return context;
}
