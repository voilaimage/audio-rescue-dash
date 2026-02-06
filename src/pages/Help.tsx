import React from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Settings, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  Shield,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import appBg from "@/assets/app-bg.png";
import logoWhite from "@/assets/logo-white.png";

export default function Help() {
  return (
    <MobileLayout>
      <div 
        className="h-full flex flex-col safe-top"
        style={{
          backgroundImage: `url(${appBg})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-5 pt-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoWhite} alt="Audio Salvage UK" className="h-16 w-auto" />
          </div>

          <h1 className="mb-2 font-display text-2xl font-bold text-white">Help & Support</h1>
          <p className="mb-5 text-sm text-white/60">
            Learn about app features and get help with common issues
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          <div className="space-y-4">
            
            {/* Push Notifications Section */}
            <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Push Notifications</h2>
              </div>
              
              <p className="text-sm text-white/80">
                Stay informed about your collection requests with instant push notifications. 
                Get notified when your request status changes—from accepted to scheduled to collected.
              </p>

              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  What You'll Be Notified About
                </h3>
                
                <div className="space-y-2">
                  <NotificationItem 
                    title="Request Accepted" 
                    description="When your collection request has been accepted by our team"
                  />
                  <NotificationItem 
                    title="Collection Scheduled" 
                    description="When a pickup date and time has been assigned"
                  />
                  <NotificationItem 
                    title="Items Collected" 
                    description="Confirmation that your items have been picked up"
                  />
                  <NotificationItem 
                    title="Request Cancelled" 
                    description="If your request has been cancelled for any reason"
                  />
                </div>
              </div>
            </div>

            {/* How to Enable Section */}
            <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">How to Enable Notifications</h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Open the mobile app</p>
                    <p className="text-xs text-white/60">
                      Push notifications are only available in the iOS and Android app
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Go to your Profile</p>
                    <p className="text-xs text-white/60">
                      Tap the profile icon in the navigation bar
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Toggle Push Notifications</p>
                    <p className="text-xs text-white/60">
                      Find the Notifications section and turn on the toggle
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Allow notifications</p>
                    <p className="text-xs text-white/60">
                      When prompted, tap "Allow" to grant notification permissions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Troubleshooting Section */}
            <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Troubleshooting</h2>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="not-receiving" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    I'm not receiving notifications
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    <ul className="space-y-2 list-disc pl-4">
                      <li>Check that notifications are enabled in your Profile settings</li>
                      <li>Make sure you've allowed notifications in your phone's Settings app</li>
                      <li>On iOS: Settings → Audio Salvage → Notifications → Allow Notifications</li>
                      <li>On Android: Settings → Apps → Audio Salvage → Notifications → Enable</li>
                      <li>Try disabling and re-enabling notifications in the app</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="delayed" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    Notifications are delayed
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    <ul className="space-y-2 list-disc pl-4">
                      <li>Ensure you have a stable internet connection</li>
                      <li>Disable battery optimization for the app (Android)</li>
                      <li>Check that Background App Refresh is enabled (iOS)</li>
                      <li>Notifications are processed every minute, so slight delays are normal</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="toggle-disabled" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    The notification toggle is disabled
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    <p className="mb-2">
                      The toggle only works in the native iOS or Android app. If you're viewing this on a web browser:
                    </p>
                    <ul className="space-y-2 list-disc pl-4">
                      <li>Download the app from the App Store or Google Play</li>
                      <li>Log in with the same account</li>
                      <li>Enable notifications from your Profile</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="multiple-devices" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    Using multiple devices
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    <p>
                      You can receive notifications on multiple devices. Simply enable notifications 
                      on each device where you have the app installed. All registered devices will 
                      receive notifications when your request status changes.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="privacy" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    Privacy & data security
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    <div className="flex items-start gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p>Your notification preferences and device tokens are securely stored and encrypted.</p>
                    </div>
                    <ul className="space-y-2 list-disc pl-4">
                      <li>We only send notifications related to your collection requests</li>
                      <li>You can disable notifications at any time from your Profile</li>
                      <li>When you sign out, your device token is automatically removed</li>
                      <li>We never share your notification data with third parties</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* FAQ Section */}
            <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Frequently Asked Questions</h2>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    Are push notifications free?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    Yes! Push notifications are completely free and included with the app. 
                    Standard data rates from your mobile carrier may apply.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    Can I choose which notifications to receive?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    Currently, notifications are all-or-nothing. When enabled, you'll receive 
                    all status change notifications. We're working on adding more granular 
                    controls in a future update.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3" className="border-[#555555]">
                  <AccordionTrigger className="text-sm text-white hover:text-primary hover:no-underline">
                    What happens if I uninstall the app?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-white/70">
                    If you uninstall the app, you'll stop receiving notifications. When you 
                    reinstall, you'll need to enable notifications again from your Profile settings.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Contact Support */}
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-card">
              <h3 className="text-sm font-medium text-white">Still need help?</h3>
              <p className="text-xs text-white/70">
                If you're still experiencing issues with push notifications or have other questions, 
                please contact our support team and we'll be happy to assist you.
              </p>
              <a 
                href="mailto:support@audiosalvageuk.co.uk" 
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Contact Support <ChevronRight className="h-4 w-4" />
              </a>
            </div>

          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

// Helper component for notification items
function NotificationItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#28292b] p-3">
      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/60">{description}</p>
      </div>
    </div>
  );
}
