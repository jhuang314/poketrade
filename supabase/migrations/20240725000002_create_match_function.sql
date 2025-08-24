-- poketrade/supabase/migrations/20240725000002_create_match_function.sql

create or replace function find_trade_matches()
returns table (
  id uuid,
  username text,
  friend_id varchar(19)
)
language plpgsql
stable
as $$
declare
  current_user_id uuid := auth.uid();
begin
  return query
  select
    p.id,
    p.username,
    p.friend_id
  from
    public.profiles p
  where
    -- Exclude the current user
    p.id != current_user_id
    and
    -- Condition 1: Check if they have at least one card that the current user wants.
    -- (Their trade list has an intersection with my wishlist)
    exists (
      select 1
      from public.user_trade_list partner_tl
      join public.user_wishlist my_wl on partner_tl.card_identifier = my_wl.card_identifier
      where
        partner_tl.user_id = p.id
        and my_wl.user_id = current_user_id
    )
    and
    -- Condition 2: Check if the current user has at least one card that they want.
    -- (My trade list has an intersection with their wishlist)
    exists (
      select 1
      from public.user_wishlist partner_wl
      join public.user_trade_list my_tl on partner_wl.card_identifier = my_tl.card_identifier
      where
        partner_wl.user_id = p.id
        and my_tl.user_id = current_user_id
    );
end;
$$;
