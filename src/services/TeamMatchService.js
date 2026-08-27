import { supabase } from "../lib/supabase.js";
import { uploadPublicImage } from "../lib/storageImages.js";

function result(data,error){return error?{ok:false,message:error.message}:{ok:true,...(data||{})};}

function matchResultPath(url){
  try{
    const pathname=new URL(url).pathname;
    for(const marker of ["/storage/v1/object/public/match-results/","/storage/v1/object/sign/match-results/"]){
      const index=pathname.indexOf(marker);
      if(index!==-1)return decodeURIComponent(pathname.slice(index+marker.length));
    }
  }catch{/* invalid legacy value */}
  return "";
}

export async function getTeamMatchAccess(teamId){const{data,error}=await supabase.rpc("get_team_match_state",{target_team_id:teamId});return result(data,error);}
export async function beginTeamMatch(teamId){const{error}=await supabase.rpc("begin_team_match",{target_team_id:teamId});return error?{ok:false,message:error.message}:{ok:true};}
export async function submitTeamMatchCode(teamId,roomCode,playerCode){const{data,error}=await supabase.rpc("submit_team_match_round_code",{target_team_id:teamId,submitted_room_code:roomCode,submitted_player_code:playerCode});return result(data,error);}
export async function confirmTeamMatchReady(teamId){const{error}=await supabase.rpc("confirm_team_match_ready",{target_team_id:teamId});return error?{ok:false,message:error.message}:{ok:true};}
export async function uploadTeamMatchResult(teamId,file,_expectedRoomCode,onProgress){
  if(!file?.type?.startsWith("image/"))return{ok:false,message:"Maç sonucu bir görsel olmalı."};
  if(file.size>8*1024*1024)return{ok:false,message:"Görsel en fazla 8 MB olabilir."};
  onProgress?.("Maç sonucu yükleniyor…");
  let uploaded;
  try{uploaded=await uploadPublicImage({bucket:"match-results",prefix:teamId,label:"result",file});}
  catch(error){return{ok:false,message:error.message};}
  const{error}=await supabase.rpc("complete_team_match",{target_team_id:teamId,result_url:uploaded.url,detected_text_value:""});
  if(error){await supabase.storage.from("match-results").remove([uploaded.path]);return{ok:false,message:error.message};}
  return{ok:true,url:uploaded.url};
}
export async function fetchMatchEvidence(){const{data,error}=await supabase.from("team_match_rounds").select("id,team_id,result_image_url,completed_at,verification_status,teams(name)").in("status",["pending_review","completed"]).not("result_image_url","is",null).order("created_at",{ascending:false});if(error)return[];return Promise.all((data||[]).map(async item=>{const path=matchResultPath(item.result_image_url);let url="";if(path){const{data:signed}=await supabase.storage.from("match-results").createSignedUrl(path,300);url=signed?.signedUrl||"";}return{id:item.id,teamId:item.team_id,teamName:item.teams?.name||"Takım",url,path,completedAt:item.completed_at,status:item.verification_status};}));}
export async function reviewMatchEvidence(id,decision){const{error}=await supabase.rpc("review_team_match_evidence",{target_round_id:id,decision});return error?{ok:false,message:error.message}:{ok:true};}
export async function deleteMatchEvidence(id,url){const path=matchResultPath(url);const{error}=await supabase.rpc("delete_team_match_evidence",{target_round_id:id});if(error)return{ok:false,message:error.message};if(path)await supabase.storage.from("match-results").remove([path]);return{ok:true};}
export function subscribeToTeamMatch(teamId,listener,scope="detail"){const channel=supabase.channel(`team-match-${scope}-${teamId}`).on("postgres_changes",{event:"*",schema:"public",table:"team_match_rounds",filter:`team_id=eq.${teamId}`},listener).on("postgres_changes",{event:"*",schema:"public",table:"team_match_round_confirmations"},listener).subscribe();return()=>supabase.removeChannel(channel);}
