import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FCMMessage {
  to: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

// Send notification via FCM
async function sendFCMNotification(
  deviceToken: string, 
  payload: NotificationPayload,
  fcmServerKey: string
): Promise<{ success: boolean; error?: string }> {
  const message: FCMMessage = {
    to: deviceToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
  };

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM error response:', errorText);
      return { success: false, error: `FCM request failed: ${response.status}` };
    }

    const result = await response.json();
    console.log('FCM response:', result);
    
    if (result.failure > 0) {
      return { success: false, error: result.results?.[0]?.error || 'Unknown FCM error' };
    }

    return { success: true };
  } catch (error) {
    console.error('FCM send error:', error);
    return { success: false, error: String(error) };
  }
}

// Generate human-readable notification message
function getStatusMessage(oldStatus: string, newStatus: string): { title: string; body: string } {
  const statusMessages: Record<string, { title: string; body: string }> = {
    'new_accepted': {
      title: 'Request Accepted',
      body: 'Your collection request has been accepted and will be scheduled soon.',
    },
    'accepted_scheduled': {
      title: 'Collection Scheduled',
      body: 'Your collection has been scheduled. Check the app for pickup details.',
    },
    'scheduled_collected': {
      title: 'Items Collected',
      body: 'Your items have been collected successfully!',
    },
    'collected_completed': {
      title: 'Request Completed',
      body: 'Your collection request has been completed. Thank you!',
    },
    'cancelled': {
      title: 'Request Cancelled',
      body: 'Your collection request has been cancelled.',
    },
  };

  // Check for specific transition
  const key = `${oldStatus}_${newStatus}`;
  if (statusMessages[key]) {
    return statusMessages[key];
  }

  // Check if cancelled
  if (newStatus === 'cancelled') {
    return statusMessages['cancelled'];
  }

  // Generic fallback
  return {
    title: 'Request Updated',
    body: `Your request status changed from ${oldStatus} to ${newStatus}.`,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      console.error('FCM_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Failed to fetch notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('No pending notifications');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingNotifications.length} notifications`);

    let successCount = 0;
    let failCount = 0;

    for (const notification of pendingNotifications) {
      // Get user's push tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('push_tokens')
        .select('device_token, platform')
        .eq('user_id', notification.user_id);

      if (tokenError || !tokens || tokens.length === 0) {
        console.log(`No tokens for user ${notification.user_id}`);
        // Mark as sent with note
        await supabase
          .from('notification_queue')
          .update({ 
            sent_at: new Date().toISOString(),
            error_message: 'No device tokens registered'
          })
          .eq('id', notification.id);
        continue;
      }

      const message = getStatusMessage(
        notification.old_status || 'unknown', 
        notification.new_status || 'unknown'
      );

      const payload: NotificationPayload = {
        title: message.title,
        body: message.body,
        data: {
          request_id: notification.request_id,
          event_type: notification.event_type,
          old_status: notification.old_status || '',
          new_status: notification.new_status || '',
        },
      };

      let allSuccess = true;
      let lastError = '';

      // Send to all user devices
      for (const token of tokens) {
        const result = await sendFCMNotification(token.device_token, payload, fcmServerKey);
        if (!result.success) {
          allSuccess = false;
          lastError = result.error || 'Unknown error';
          console.error(`Failed to send to ${token.platform}: ${result.error}`);
          
          // Remove invalid tokens
          if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
            await supabase
              .from('push_tokens')
              .delete()
              .eq('device_token', token.device_token);
            console.log(`Removed invalid token: ${token.device_token.substring(0, 20)}...`);
          }
        }
      }

      // Update notification queue
      await supabase
        .from('notification_queue')
        .update({ 
          sent_at: new Date().toISOString(),
          error_message: allSuccess ? null : lastError
        })
        .eq('id', notification.id);

      if (allSuccess) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`Processed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed',
        processed: pendingNotifications.length,
        success: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
