import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-white.png";

export default function TermsOfService() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {lastUpdated}
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using the Audio Salvage Partner application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed">
              Audio Salvage UK provides a free collection service for faulty or unwanted high-end audio equipment. The App allows registered partners to submit collection requests, track request status, and coordinate equipment pickup.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              To use the App, you must create an account and provide accurate, complete information. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your contact and business information is current</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Collection Requests</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              When submitting a collection request, you agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Provide accurate descriptions and photographs of equipment</li>
              <li>Ensure equipment is accessible for collection at the scheduled time</li>
              <li>Be available or have an authorized representative present during collection</li>
              <li>Only submit equipment that you own or have authority to dispose of</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-3">
              We reserve the right to refuse collection of any items at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Equipment Ownership</h2>
            <p className="text-gray-300 leading-relaxed">
              By submitting a collection request, you confirm that you have full legal right to transfer ownership of the equipment to Audio Salvage UK. Upon collection, all rights and ownership of the equipment transfer to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable Use</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Use the App for any unlawful purpose</li>
              <li>Submit false or misleading information</li>
              <li>Attempt to gain unauthorized access to any part of the App</li>
              <li>Interfere with or disrupt the App's operation</li>
              <li>Upload malicious content or viruses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed">
              The App and its original content, features, and functionality are owned by Audio Salvage UK and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              To the maximum extent permitted by law, Audio Salvage UK shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App or our services. Our total liability shall not exceed the amount you have paid us, if any, in the twelve months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-gray-300 leading-relaxed">
              The App is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of significant changes by posting the new Terms on this page. Your continued use of the App after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-3 p-4 rounded-lg bg-[#1d1d1d] border border-border">
              <p className="text-white font-medium">Audio Salvage UK</p>
              <p className="text-gray-300 mt-1">Email: legal@audiosalvage.co.uk</p>
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
