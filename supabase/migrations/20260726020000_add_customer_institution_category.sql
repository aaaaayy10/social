-- 고객사 기관 구분(대학교/관공서/기업/초중고)을 저장하는 컬럼 추가
ALTER TABLE public.customers
  ADD COLUMN institution_category text;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_institution_category_check
  CHECK (institution_category IS NULL OR institution_category = ANY (ARRAY['대학교'::text, '관공서'::text, '기업'::text, '초중고'::text]));
