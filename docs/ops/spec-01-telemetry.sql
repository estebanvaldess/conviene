-- Dashboard mínimo día-1: requests vs guardrail.
select date(created_at at time zone 'America/Santiago') as clt_day, count(*) as api_requests,
       7000 as alert_threshold, 8500 as p2_cut_threshold
from events
where type = 'api_request'
group by 1
order by 1 desc;

-- Cobertura del espejo.
select 'purchase_orders' as table_name, count(*) as rows from purchase_orders
union all
select 'tenders', count(*) from tenders
union all
select 'companies', count(*) from companies;
