-- Create AI usage statistics table
CREATE TABLE public.ai_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  condominium_id uuid REFERENCES public.condominiums(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_category text,
  was_resolved boolean DEFAULT null,
  response_time_ms integer,
  tools_used text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

-- Admins can view all stats
CREATE POLICY "Admins can view AI stats" 
ON public.ai_usage_stats FOR SELECT 
USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role) OR 
  public.has_role(auth.uid(), 'sindico'::public.app_role)
);

-- System can insert stats (via edge function with service role)
CREATE POLICY "Service role can insert stats" 
ON public.ai_usage_stats FOR INSERT 
WITH CHECK (true);

-- Create index for common queries
CREATE INDEX idx_ai_usage_stats_created_at ON public.ai_usage_stats(created_at DESC);
CREATE INDEX idx_ai_usage_stats_condominium ON public.ai_usage_stats(condominium_id);
CREATE INDEX idx_ai_usage_stats_category ON public.ai_usage_stats(question_category);