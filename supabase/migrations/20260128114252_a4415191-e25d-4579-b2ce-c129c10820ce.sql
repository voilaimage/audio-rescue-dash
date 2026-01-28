-- Add DELETE policy for users to delete their own requests
CREATE POLICY "Users can delete their own requests" 
ON public.requests 
FOR DELETE 
USING (auth.uid() = user_id);