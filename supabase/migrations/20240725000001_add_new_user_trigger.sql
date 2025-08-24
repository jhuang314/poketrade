-- This trigger automatically creates a profile for new users.
-- It copies the username and friend_id from the user's metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, friend_id)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'friend_id');
  return new;
end;
$$;

-- Fire the trigger after a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
