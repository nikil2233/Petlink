ALTER TABLE public.adoption_requests 
ADD COLUMN IF NOT EXISTS meeting_datetime timestamp with time zone,
ADD COLUMN IF NOT EXISTS meeting_instructions text;
