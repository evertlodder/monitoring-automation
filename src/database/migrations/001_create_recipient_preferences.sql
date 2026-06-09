-- Create recipient_preferences table for email routing
CREATE TABLE IF NOT EXISTS public.recipient_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,                    -- 'management' | 'technician'
  recipient_name TEXT NOT NULL,          -- 'Evert', 'Mike', 'Paul (Kisima)', etc
  recipient_email TEXT NOT NULL,
  farm_ids TEXT[],                       -- ['alisha', 'ayana'] or NULL for all farms
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipient_preferences_role
  ON public.recipient_preferences(role);
CREATE INDEX IF NOT EXISTS idx_recipient_preferences_active
  ON public.recipient_preferences(active);

-- Seed with initial data (Management tier)
INSERT INTO public.recipient_preferences
  (role, recipient_name, recipient_email, farm_ids, active)
VALUES
  ('management', 'Evert (BV)', 'evert@greenspark.co.ke', NULL, true),
  ('management', 'Mike (LTD Tech Lead)', 'mike.mwangi@greenspark.co.ke', NULL, true)
ON CONFLICT DO NOTHING;

-- Comment
COMMENT ON TABLE public.recipient_preferences IS
  'Routes daily farm reports to different recipients. farm_ids=NULL means all farms.';
