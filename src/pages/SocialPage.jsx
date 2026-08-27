import { Ban, CheckCheck, MessageCircle, Search, Send, Trash2, Trophy, UserMinus, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import { useAdminOperations } from "../context/AdminOperationsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocial } from "../context/SocialContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { loyaltyTiers } from "../context/LoyaltyContext.jsx";
import PlayerCareerModal from "../components/PlayerCareerModal.jsx";

const tabs = [["players", "Oyuncular"], ["requests", "İstekler"], ["friends", "Arkadaşlar"], ["messages", "Mesajlar"], ["teams", "Takım Sohbetleri"], ["tournaments", "Turnuva Sohbetleri"]];

export default function SocialPage() {
  const { user } = useAuth();
  const social = useSocial();
  const operations = useAdminOperations();
  const { notifications, markTypesRead, markAsRead } = useNotifications();
  const [tab, setTab] = useState("players");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => { const requested = searchParams.get("tab"); if (tabs.some(([id]) => id === requested)) { setTab(requested); setChannel(null); } }, [searchParams]);
  const unreadByTab = {
    messages: notifications.filter((item) => !item.isRead && item.type === "direct_message").length,
    teams: notifications.filter((item) => !item.isRead && item.type === "team_message").length,
    tournaments: notifications.filter((item) => !item.isRead && item.type === "tournament_message").length
  };
  useEffect(() => { if (tab === "messages") markTypesRead(["direct_message"]); }, [tab]);
  const [channel, setChannel] = useState(null);
  const [query, setQuery] = useState("");
  const selectedProfile = null;
  const setSelectedProfile = (player) => { if (player?.id) navigate(`/oyuncu/${player.id}`); };
  const [removeCandidate, setRemoveCandidate] = useState(null);
  useEffect(() => { if (tab === "friends" && channel) setTab("messages"); }, [tab, channel]);
  const withGameProfile = (player) => { const membership = operations.teams.flatMap((team) => team.members || []).find((member) => member.email === player.email || member.name === player.name); return { ...player, playerRole: player.playerRole || membership?.role || "Belirtilmedi", rank: player.rank || membership?.rank || "Belirtilmedi", game: player.game || membership?.game || "Belirtilmedi" }; };
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const verifiedOnly = searchParams.get("verified") === "1";
  const players = verifiedOnly
    ? social.allUsers.filter((item) => item.isVerified && (!normalizedQuery || item.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery))).map(withGameProfile)
    : normalizedQuery.length >= 2 ? social.allUsers.filter((item) => item.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery)).map(withGameProfile) : [];
  const myTeams = operations.activeTeams.filter((team) => team.captainEmail === user.email || (team.members || []).some((member) => member.email === user.email));
  const myTournaments = operations.publishedTournaments.filter((tournament) => tournament.ownerEmail === user.email || operations.tournamentApplications.some((application) => (application.tournamentId === tournament.id || application.tournamentName === tournament.name) && application.userEmail === user.email && application.status === "approved"));
  const unreadTeamChannels = unreadChannels(notifications, "team_message");
  const unreadTournamentChannels = unreadChannels(notifications, "tournament_message");
  const isFriend = (email) => social.friendEmails.includes(email);
  const hasPending = (email) => social.outgoingRequests.some((item) => item.toEmail === email) || social.incomingRequests.some((item) => item.fromEmail === email);

  const openTab = (nextTab) => { setTab(nextTab); setChannel(null); navigate(`/sosyal?tab=${nextTab}`); };
  const openChannel = (type, group) => {
    setChannel({ type, id: group.id, name: `${group.name} ${type === "team" ? "Takım" : "Turnuva"} Sohbeti` });
    const notificationType = type === "team" ? "team_message" : "tournament_message";
    notifications.filter((item) => !item.isRead && item.type === notificationType && String(item.entityId) === String(group.id)).forEach((item) => markAsRead(item.id));
  };
  useEffect(() => {
    const entityId = searchParams.get("entity");
    if (!entityId || !["teams", "tournaments"].includes(tab)) return;
    const groups = tab === "teams" ? myTeams : myTournaments;
    const group = groups.find((item) => String(item.id) === String(entityId));
    if (group) openChannel(tab === "teams" ? "team" : "tournament", group);
  }, [tab, searchParams.toString(), operations.teams.length, operations.tournamentApplications.length]);
  const sectionContent = tab === "friends" ? <CardList empty="Henüz arkadaşın yok.">{social.friends.map(withGameProfile).map((friend) => <UserCard key={friend.email} player={friend} onProfile={() => setSelectedProfile(friend)}><button type="button" onClick={() => { setTab("messages"); setChannel({ type: "direct", id: friend.email, name: friend.name }); }} className="primary-button px-3 py-2 text-xs"><MessageCircle className="h-4 w-4" /> Mesaj</button><button type="button" onClick={() => setRemoveCandidate(friend)} className="secondary-button border-red-300/20 px-3 py-2 text-xs text-red-200"><UserMinus className="h-4 w-4" /> Çıkar</button></UserCard>)}</CardList>
    : tab === "messages" ? channel ? <ChatPanel channel={channel} social={social} onBack={() => setChannel(null)} /> : <CardList empty="Mesajlaşabileceğin bir arkadaşın yok.">{social.friends.map(withGameProfile).map((friend) => <UserCard key={friend.email} player={friend}><button type="button" onClick={() => setChannel({ type: "direct", id: friend.email, name: friend.name })} className="primary-button px-3 py-2 text-xs"><MessageCircle className="h-4 w-4" /> Sohbeti Aç</button></UserCard>)}</CardList>
    : tab === "teams" ? channel ? <ChatPanel channel={channel} social={social} onBack={() => setChannel(null)} /> : <GroupList groups={myTeams} unreadById={unreadTeamChannels} empty="Sohbet edebileceğin takım yok." onOpen={(team) => openChannel("team", team)} />
    : tab === "tournaments" ? channel ? <ChatPanel channel={channel} social={social} onBack={() => setChannel(null)} /> : <GroupList groups={myTournaments} unreadById={unreadTournamentChannels} empty="Sohbet edebileceğin turnuva yok." onOpen={(tournament) => openChannel("tournament", tournament)} /> : null;

  return <><PageHero kicker="Sosyal merkez" eyebrow="Arkadaşınla daha güçlüsün" title="Arkadaşlarınla bağlan, mesajlaş, takımını kur." description="Arkadaş ekle, mesajlaş, takım sohbetlerine katıl ya da turnuva gruplarında ilerleme geç." backgroundKey="community" iconKey="community" /><section className="container-shell social-hub pb-16">
    <div className="social-hub__top">
      <section className="social-panel social-player-panel">
        <div className="social-panel__title"><span>Oyuncular</span></div>
        <div className="social-search"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={verifiedOnly ? "Onaylı oyuncularda ara..." : "Oyuncu adı veya kullanıcı adı ara..."} autoComplete="off" />{verifiedOnly ? <b>Onaylı</b> : null}</div>
        {!verifiedOnly && normalizedQuery.length < 2 ? <div className="social-empty"><UserPlus /><strong>Arkadaşını bulmak için kullanıcı adını yaz.</strong><span>Arama sonuçları gerçek oyuncu hesaplarından gelir.</span></div> : <CardList empty={verifiedOnly ? "Henüz listelenecek onaylı oyuncu yok." : "Bu kullanıcı adıyla eşleşen oyuncu bulunamadı."}>{players.map((player) => <UserCard key={player.email} player={player} onProfile={() => setSelectedProfile(player)}>{isFriend(player.email) ? <button type="button" onClick={() => { setTab("messages"); setChannel({ type: "direct", id: player.email, name: player.name }); }} className="primary-button px-3 py-2 text-xs"><MessageCircle className="h-4 w-4" /> Mesaj</button> : <button type="button" disabled={hasPending(player.email)} onClick={() => social.sendFriendRequest(player)} className="secondary-button px-3 py-2 text-xs disabled:opacity-40"><UserPlus className="h-4 w-4" /> {hasPending(player.email) ? "İstek Bekliyor" : "Arkadaş Ekle"}</button>}</UserCard>)}</CardList>}
      </section>
      <aside className="social-panel social-request-panel">
        <div className="social-panel__title"><span>Arkadaşlık İstekleri</span><b>{social.incomingRequests.length}</b></div>
        <CardList empty="Bekleyen arkadaşlık isteğin yok.">{social.incomingRequests.map((request) => <UserCard key={request.id} player={{ name: request.fromName }}><button type="button" onClick={() => social.reviewFriendRequest(request.id, "rejected")} className="secondary-button px-3 py-2 text-xs">Reddet</button><button type="button" onClick={() => social.reviewFriendRequest(request.id, "approved")} className="primary-button px-3 py-2 text-xs">Kabul Et</button></UserCard>)}</CardList>
        {social.outgoingRequests.length ? <div className="social-outgoing"><p>Gönderilen istekler</p>{social.outgoingRequests.map((request) => <span key={request.id}>{request.toName}<b>Beklemede</b></span>)}</div> : null}
      </aside>
    </div>
    <div className="social-shortcuts">
      <SocialShortcut icon={Users} title="Arkadaşların" active={tab === "friends"} onClick={() => openTab("friends")} empty="Arkadaş listesini görüntüle" />
      <SocialShortcut icon={MessageCircle} title="Mesajların" count={unreadByTab.messages} active={tab === "messages"} onClick={() => openTab("messages")} empty="Özel mesajlarını aç" />
      <SocialShortcut icon={Users} title="Takım Sohbetlerin" count={unreadByTab.teams} active={tab === "teams"} onClick={() => openTab("teams")} empty={`${myTeams.length} takım sohbeti`} />
      <SocialShortcut icon={Trophy} title="Turnuva Sohbetlerin" count={unreadByTab.tournaments} active={tab === "tournaments"} onClick={() => openTab("tournaments")} empty={`${myTournaments.length} turnuva sohbeti`} />
    </div>
    {sectionContent ? <section className="social-panel social-content-panel"><div className="social-panel__title"><span>{tabs.find(([id]) => id === tab)?.[1]}</span></div>{sectionContent}</section> : null}
  </section>{selectedProfile ? <PlayerProfileModal player={selectedProfile} onClose={() => setSelectedProfile(null)} /> : null}{removeCandidate ? <ConfirmFriendRemoval player={removeCandidate} onCancel={() => setRemoveCandidate(null)} onConfirm={() => { social.removeFriend(removeCandidate.email); setRemoveCandidate(null); }} /> : null}</>;
}

function SocialShortcut({ icon: Icon, title, count, active, onClick, empty }) { return <button type="button" onClick={onClick} className={`social-shortcut ${active ? "is-active" : ""}`}><Icon /><span><strong>{title}</strong><small>{empty}</small></span>{count ? <b>{count}</b> : null}</button>; }

function LegacyChatPanel({ channel, social, onBack }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const messages = useMemo(() => channel.type === "direct" ? social.getDirectMessages(channel.id) : social.getChannelMessages(channel.type, channel.id), [channel, social]);
  const send = async (event) => { event.preventDefault(); const result = channel.type === "direct" ? await social.sendDirectMessage(channel.id, text) : await social.sendChannelMessage(channel.type, channel.id, text); if (result.ok) setText(""); };
  return <div><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-bull-neon">Sohbet</p><h2 className="text-xl font-black">{channel.name}</h2></div><button type="button" onClick={onBack} className="secondary-button px-3 py-2 text-xs">Geri</button></div><div className="h-[420px] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-4">{messages.map((message) => <div key={message.id} className={`flex ${message.senderEmail === user.email ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-xl px-3 py-2 ${message.senderEmail === user.email ? "bg-bull-neon/25" : "bg-white/[0.07]"}`}><p className="text-[10px] font-black text-white/40">{message.senderName}</p><p className="mt-1 text-sm text-white">{message.text}</p><p className="mt-1 text-[9px] text-white/30">{new Date(message.createdAt).toLocaleString("tr-TR")}</p></div></div>)}{messages.length === 0 ? <p className="pt-36 text-center text-xs text-white/35">Henüz mesaj yok. İlk mesajı sen gönder.</p> : null}</div><form onSubmit={send} className="mt-3 flex gap-2"><input required maxLength="500" value={text} onChange={(event) => setText(event.target.value)} placeholder="Mesajını yaz..." className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-bull-neon" /><button className="primary-button px-4" aria-label="Mesaj gönder"><Send className="h-4 w-4" /></button></form></div>;
}

function ChatPanel({ channel, social, onBack }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const direct = channel.type === "direct";
  const blocked = direct && social.isBlocked(channel.id);
  const blockedBy = direct && social.isBlockedBy(channel.id);
  const messages = useMemo(() => direct ? social.getDirectMessages(channel.id) : social.getChannelMessages(channel.type, channel.id), [channel, direct, social]);
  useEffect(() => { if (direct) social.markDirectSeen(channel.id); }, [channel.id, direct, messages.length]);
  const send = async (event) => { event.preventDefault(); const result = direct ? await social.sendDirectMessage(channel.id, text) : await social.sendChannelMessage(channel.type, channel.id, text); if (result.ok) { setText(""); setMessage(""); } else setMessage(result.message || "Mesaj gönderilemedi."); };
  return <div><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-bull-neon">Sohbet</p><h2 className="text-xl font-black">{channel.name}</h2></div><div className="flex flex-wrap gap-2">{direct ? <><button type="button" onClick={() => setConfirmClear(true)} className="secondary-button px-3 py-2 text-xs"><Trash2 className="h-4 w-4" /> Mesajlaşmayı Sil</button><button type="button" onClick={async () => { await social.setBlocked(channel.id,!blocked); setMessage(blocked ? "Engel kaldırıldı." : "Kullanıcı engellendi."); }} className="secondary-button border-red-300/20 px-3 py-2 text-xs text-red-200"><Ban className="h-4 w-4" /> {blocked ? "Engeli Kaldır" : "Engelle"}</button></> : null}<button type="button" onClick={onBack} className="secondary-button px-3 py-2 text-xs">Geri</button></div></div><div className="h-[420px] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-4">{messages.map((item) => { const mine = item.senderEmail === user.email; return <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-xl px-3 py-2 ${mine ? "bg-bull-neon/25" : "bg-white/[0.07]"}`}><p className="text-[10px] font-black text-white/40">{item.senderName}</p><p className="mt-1 text-sm text-white">{item.text}</p><div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-white/35"><span>{new Date(item.createdAt).toLocaleString("tr-TR")}</span>{mine && direct ? <span className={item.seenAt ? "text-sky-300" : ""}><CheckCheck className="inline h-3 w-3" /> {item.seenAt ? "Görüldü" : item.deliveredAt ? "İletildi" : "Gönderildi"}</span> : null}</div></div></div>; })}{messages.length === 0 ? <p className="pt-36 text-center text-xs text-white/35">Henüz mesaj yok. İlk mesajı sen gönder.</p> : null}</div>{message ? <p className="mt-3 text-xs font-bold text-amber-200">{message}</p> : null}<form onSubmit={send} className="mt-3 flex gap-2"><input required disabled={blocked || blockedBy} maxLength="500" value={text} onChange={(event) => setText(event.target.value)} placeholder={blocked ? "Bu kullanıcıyı engellediniz." : blockedBy ? "Bu kullanıcı sizi engelledi." : "Mesajını yaz..."} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-bull-neon disabled:opacity-45" /><button disabled={blocked || blockedBy} className="primary-button px-4 disabled:opacity-45" aria-label="Mesaj gönder"><Send className="h-4 w-4" /></button></form>{confirmClear ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && setConfirmClear(false)}><section className="glass-card w-full max-w-md rounded-2xl p-6"><span className="section-kicker">Mesaj geçmişi</span><h3 className="mt-2 text-2xl font-black">Mesajlaşmayı silmek istiyor musun?</h3><p className="mt-3 text-sm leading-6 text-white/55">{channel.name} ile olan mesajlar yalnızca senin ekranından kaldırılacak. Karşı tarafın mesaj geçmişi etkilenmeyecek.</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setConfirmClear(false)} className="secondary-button py-3">Vazgeç</button><button type="button" onClick={async () => { await social.clearConversation(channel.id); setConfirmClear(false); setMessage("Mesajlaşma geçmişi temizlendi."); }} className="rounded-lg bg-red-500 py-3 text-sm font-black text-white hover:bg-red-400">Evet, Sil</button></div></section></div> : null}</div>;
}

function UserCard({ player, children, onProfile }) { return <article role={onProfile ? "button" : undefined} tabIndex={onProfile ? 0 : undefined} onClick={onProfile} onKeyDown={(event) => { if (onProfile && (event.key === "Enter" || event.key === " ")) onProfile(); }} className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between ${onProfile ? "cursor-pointer transition hover:border-bull-neon/30 hover:bg-bull-neon/[0.05]" : ""}`}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-bull-neon/15 font-black text-bull-neon">{player.avatar ? <img src={player.avatar} alt="" className="h-full w-full object-cover" /> : player.name?.slice(0, 2).toUpperCase()}</div><div><strong>{player.name}</strong>{player.game || player.playerRole ? <small className="mt-1 block">{[player.game, player.playerRole].filter(Boolean).join(" • ")}</small> : null}</div></div><div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>{children}</div></article>; }
function PlayerProfileModal({ player, onClose }) { return <PlayerCareerModal player={player} onClose={onClose} />; }
function ProfileInfo({ label, value }) { return <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
function ConfirmFriendRemoval({ player, onCancel, onConfirm }) { return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><section className="glass-card w-full max-w-md rounded-2xl p-6"><h2 className="text-xl font-black">Arkadaşını çıkarmak istiyor musun?</h2><p className="mt-3 text-sm leading-6 text-white/55"><strong className="text-white">{player.name}</strong> arkadaş listesinden çıkarılacak ve özel mesajlaşma erişiminiz kapanacak.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="secondary-button px-4 py-2.5 text-xs">Vazgeç</button><button type="button" onClick={onConfirm} className="rounded-lg bg-red-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-400">Evet, Çıkar</button></div></section></div>; }
function CardList({ children, empty }) { const items = Array.isArray(children) ? children : [children].filter(Boolean); return <div className="space-y-2">{children}{items.length === 0 ? <p className="py-8 text-center text-xs text-white/40">{empty}</p> : null}</div>; }
function unreadChannels(notifications, type) { return notifications.filter((item) => !item.isRead && item.type === type && item.entityId).reduce((totals, item) => ({ ...totals, [String(item.entityId)]: (totals[String(item.entityId)] || 0) + 1 }), {}); }
function GroupList({ groups, empty, onOpen, unreadById = {} }) { return <div className="space-y-2">{groups.map((group) => { const unread = unreadById[String(group.id)] || 0; return <button type="button" key={group.id} onClick={() => onOpen(group)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${unread ? "border-bull-neon/60 bg-bull-neon/[0.09] shadow-[0_0_24px_rgba(255,91,0,.08)]" : "border-white/10 bg-white/[0.03]"} hover:border-bull-neon/30 hover:bg-bull-neon/[0.06]`}><span><strong>{group.name}</strong><small className="mt-1 block">{group.game}</small></span><span className="flex items-center gap-2 text-xs font-black text-bull-neon">{unread ? <b className="grid h-6 min-w-6 place-items-center rounded-full bg-bull-neon px-1.5 text-[10px] text-black">{unread}</b> : null}<Users className="h-4 w-4" /> Sohbete Gir</span></button>; })}{groups.length === 0 ? <p className="py-8 text-center text-xs text-white/40">{empty}</p> : null}</div>; }
