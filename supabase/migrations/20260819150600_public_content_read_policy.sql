drop policy if exists clinic_posts_public_read on public.clinic_posts;
create policy clinic_posts_public_read
  on public.clinic_posts
  for select
  to anon, authenticated
  using (published = true);
