import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-white.png";

export default function PrivacyPolicy() {
  const lastUpdated = "7 February 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-[#1d1d1d] px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Audio Salvage UK" className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {lastUpdated}
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Audio Salvage UK ("we", "our", or "us") operates the Audio Salvage Partner mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.
            </p>
            <p className="text-gray-300 leading-relaxed mt-3">
              By using the App, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              We collect information you provide directly to us when you:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Create an account and complete your business profile</li>
              <li>Submit collection requests</li>
              <li>Upload photographs of audio equipment</li>
              <li>Contact us for support</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number</li>
              <li><strong>Business Information:</strong> Business name, address (including postcode and city)</li>
              <li><strong>Collection Request Data:</strong> Equipment descriptions, photographs, preferred collection times</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers</li>
              <li><strong>Usage Data:</strong> App features used, interaction timestamps</li>
              <li><strong>Push Notification Tokens:</strong> For sending you collection status updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Process and manage your collection requests</li>
              <li>Communicate with you about your requests and our services</li>
              <li>Send push notifications about collection status updates</li>
              <li>Schedule and coordinate equipment collection with our drivers</li>
              <li>Improve and optimize our App and services</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Information Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Collection Drivers:</strong> Your business name, address, and contact details are shared with our drivers to facilitate equipment collection</li>
              <li><strong>Service Providers:</strong> Third-party companies that help us operate our App (hosting, analytics, push notifications)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-3">
              We do not sell, trade, or rent your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Storage and Security</h2>
            <p className="text-gray-300 leading-relaxed">
              Your data is stored securely using industry-standard encryption and security measures. We use Supabase for data storage, which employs robust security practices including encrypted connections and secure authentication.
            </p>
            <p className="text-gray-300 leading-relaxed mt-3">
              While we implement safeguards to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Under applicable data protection laws, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Restriction:</strong> Limit how we use your data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Object:</strong> Object to certain processing of your data</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-3">
              To exercise these rights, please contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you services. We may also retain and use your information to comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Push Notifications</h2>
            <p className="text-gray-300 leading-relaxed">
              With your consent, we send push notifications to update you on collection request status changes. You can disable push notifications at any time through your device settings or within the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our App is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected data from a child under 16, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-3 p-4 rounded-lg bg-[#1d1d1d] border border-border">
              <p className="text-white font-medium">Audio Salvage UK</p>
              <p className="text-gray-300 mt-1">Email: privacy@audiosalvage.co.uk</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Audio Salvage UK. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
