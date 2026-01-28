-- Create a table to store specific users allowed in block groups
CREATE TABLE IF NOT EXISTS public.block_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_group_id UUID NOT NULL REFERENCES public.block_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(block_group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.block_group_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view group members" 
ON public.block_group_members 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage group members" 
ON public.block_group_members 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.block_groups bg
        JOIN public.condominiums c ON bg.condominium_id = c.id
        WHERE bg.id = block_group_id
        AND (
            public.has_role(auth.uid(), 'sindico') OR 
            public.has_role(auth.uid(), 'administrador')
        )
    )
);

-- Update message_permission check constraint to include 'specific_users'
ALTER TABLE public.block_groups DROP CONSTRAINT IF EXISTS block_groups_message_permission_check;
ALTER TABLE public.block_groups ADD CONSTRAINT block_groups_message_permission_check 
    CHECK (message_permission IN ('members', 'admins_only', 'specific_users'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_block_group_members_group_id ON public.block_group_members(block_group_id);
CREATE INDEX IF NOT EXISTS idx_block_group_members_user_id ON public.block_group_members(user_id);