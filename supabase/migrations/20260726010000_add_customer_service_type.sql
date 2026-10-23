-- 고객이 이용 중인 서비스 구분(팩트챗/인포미/팩트챗+인포미)을 저장하는 컬럼 추가
ALTER TABLE public.customers
  ADD COLUMN service_type text;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_service_type_check
  CHECK (service_type IS NULL OR service_type = ANY (ARRAY['팩트챗'::text, '인포미'::text, '팩트챗+인포미'::text]));
