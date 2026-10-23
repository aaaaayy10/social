-- sync_revenue_paid_from_deposit()의 매칭 후보 선택에서 min(uuid)를 사용해
-- "function min(uuid) does not exist" 오류로 입금 등록/수정 자체가 실패하던 버그 수정.
-- count(*) = 1 로 이미 단일 후보임을 보장하므로 array_agg 로 첫 값을 꺼내는 방식으로 대체한다.

CREATE OR REPLACE FUNCTION public.sync_revenue_paid_from_deposit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  matched_revenue_id uuid;
begin
  if new.revenue_id is null then
    select case when count(*) = 1 then (array_agg(candidate.id))[1] else null end
      into matched_revenue_id
      from (
        select r.id
          from public.revenues r
          left join public.projects p
            on p.id = r.project_id
          left join public.customers c
            on c.id = p.customer_id
         where r.is_paid = false
           and r.total_amount = new.amount
           and (
             public.normalize_business_name(new.depositor_name) <> ''
             and public.normalize_business_name(new.depositor_name) in (
               public.normalize_business_name(c.name),
               public.normalize_business_name(c.account_holder),
               public.normalize_business_name(p.client),
               public.normalize_business_name(p.name),
               public.normalize_business_name(r.title)
             )
           )
      ) candidate;

    if matched_revenue_id is not null then
      new.revenue_id := matched_revenue_id;
    end if;
  end if;

  if new.revenue_id is not null
     and (
       tg_op = 'INSERT'
       or old.revenue_id is distinct from new.revenue_id
       or old.deposit_date is distinct from new.deposit_date
     ) then
    update public.revenues
       set is_paid = true,
           paid_date = new.deposit_date
     where id = new.revenue_id;
  end if;

  return new;
end;
$$;
