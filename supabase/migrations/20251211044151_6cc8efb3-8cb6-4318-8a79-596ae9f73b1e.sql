-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'package', 'reservation', 'visitor', 'maintenance', 'financial', 'system'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  link TEXT, -- route to redirect when clicked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to profiles
ALTER TABLE public.notifications
ADD CONSTRAINT fk_notifications_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;