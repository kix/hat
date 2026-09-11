-- RPC функция для рассылки новостей и анонсов релизов всем подключенным игрокам Telegram
create or replace function public.broadcast_release_news(p_text text)
returns table(sent_count integer, total_count integer) as $$
declare
    v_token text;
    v_sent integer := 0;
    v_total integer := 0;
    v_status integer;
    v_content text;
    r record;
begin
    -- Получаем токен бота из Supabase Vault
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'telegram_bot_token'
    limit 1;

    if v_token is null then
        raise notice 'broadcast_release_news: no telegram_bot_token in Vault; nothing sent';
        return query select 0, 0;
        return;
    end if;

    -- Собираем всех уникальных пользователей Telegram, включивших уведомления или привязавших профиль
    for r in
        select distinct telegram_id
        from public.telegram_notifications
        where enabled = true and telegram_id is not null and telegram_id != ''
    loop
        v_total := v_total + 1;
        begin
            select status, content into v_status, v_content
            from http_post(
                'https://api.telegram.org/bot' || v_token || '/sendMessage',
                json_build_object(
                    'chat_id', r.telegram_id,
                    'text', p_text,
                    'parse_mode', 'HTML',
                    'disable_web_page_preview', false
                )::text,
                'application/json'
            );

            if v_status between 200 and 299 then
                v_sent := v_sent + 1;
            else
                raise notice 'HTTP % sending to %: %', v_status, r.telegram_id, v_content;
            end if;
        exception when others then
            raise notice 'Failed to send to %: %', r.telegram_id, sqlerrm;
        end;
    end loop;

    return query select v_sent, v_total;
end;
$$ language plpgsql security definer;

grant execute on function public.broadcast_release_news(text) to anon, authenticated, service_role;
