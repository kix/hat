-- RPC function to get top hardest words with average/max times and definitions
create or replace function public.get_hardest_words(p_limit integer default 10)
returns table(
    word text,
    avg_sec numeric,
    max_sec numeric,
    solves_count bigint,
    definition text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    return query
    with aggregated as (
        select
            lower(trim(w.word)) as clean_word,
            avg(w.time_ms / 1000.0) as avg_duration,
            max(w.time_ms / 1000.0) as max_duration,
            count(*) as count_total
        from public.word_solution_times w
        group by lower(trim(w.word))
    )
    select
        a.clean_word as word,
        round(a.avg_duration, 1) as avg_sec,
        round(a.max_duration, 1) as max_sec,
        a.count_total as solves_count,
        coalesce(wd.definition, '') as definition
    from aggregated a
    left join public.word_definitions wd on wd.word = a.clean_word
    order by a.avg_duration desc
    limit p_limit;
end;
$$;

grant execute on function public.get_hardest_words(integer) to anon, authenticated, service_role;
