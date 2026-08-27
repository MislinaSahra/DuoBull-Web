-- Re-grant functions recreated by later migrations. Security remains inside each function.
grant execute on function public.get_team_match_state(uuid) to authenticated;
grant execute on function public.submit_team_match_round_code(uuid,text,text) to authenticated;
grant execute on function public.confirm_team_match_ready(uuid) to authenticated;
grant execute on function public.complete_team_match(uuid,text,text) to authenticated;
grant execute on function public.review_team_match_evidence(uuid,text) to authenticated;

-- The code exchange remains required to establish the player-to-player match.
-- Only OCR / room-code presence in the uploaded result image is removed.
drop function if exists public.begin_team_match(uuid);
