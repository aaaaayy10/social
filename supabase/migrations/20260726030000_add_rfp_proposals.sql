-- RFP제안서(영업) 메뉴: 대학교/공공기관 등에 제출하는 RFP 제안 건을 상태 파이프라인으로 추적하는 테이블
CREATE TABLE public.rfp_proposals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  institution_name text NOT NULL,
  customer_id uuid,
  institution_category text,
  service_type text,
  notice_date date,
  submission_deadline date,
  status text DEFAULT '준비중'::text NOT NULL,
  assigned_to uuid,
  remark text,
  memo text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rfp_proposals_pkey PRIMARY KEY (id),
  CONSTRAINT rfp_proposals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  CONSTRAINT rfp_proposals_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.employees(id) ON DELETE SET NULL,
  CONSTRAINT rfp_proposals_institution_category_check
    CHECK (institution_category IS NULL OR institution_category = ANY (ARRAY['대학교'::text, '관공서'::text, '기업'::text, '초중고'::text])),
  CONSTRAINT rfp_proposals_service_type_check
    CHECK (service_type IS NULL OR service_type = ANY (ARRAY['팩트챗'::text, '인포미'::text, '팩트챗+인포미'::text])),
  CONSTRAINT rfp_proposals_status_check
    CHECK (status = ANY (ARRAY['준비중'::text, '제출완료'::text, '수주'::text, '실주'::text, '보류'::text]))
);

ALTER TABLE public.rfp_proposals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER rfp_proposals_updated_at BEFORE UPDATE ON public.rfp_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Authenticated users can select rfp_proposals" ON public.rfp_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rfp_proposals" ON public.rfp_proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rfp_proposals" ON public.rfp_proposals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rfp_proposals" ON public.rfp_proposals FOR DELETE TO authenticated USING (true);

GRANT ALL ON TABLE public.rfp_proposals TO anon;
GRANT ALL ON TABLE public.rfp_proposals TO authenticated;
GRANT ALL ON TABLE public.rfp_proposals TO service_role;
