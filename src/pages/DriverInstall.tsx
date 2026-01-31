import { useState, useEffect } from "react";
import { Truck, Download, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-white.png";
import authBg from "@/assets/auth-bg.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DriverInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-background relative overflow-hidden"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <img src={logo} alt="Audio Salvage UK" className="h-24 w-auto" />
          <div className="mt-2 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <p className="text-lg text-primary font-semibold">Driver App</p>
          </div>
        </div>

        {/* Install Card */}
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-primary/30 bg-[#1d1d1d] backdrop-blur-sm p-6 shadow-card">
            {isInstalled ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">App Installed!</h2>
                <p className="text-gray-400 mb-4">
                  The Driver App is now on your home screen. Open it to sign in.
                </p>
                <Button 
                  onClick={() => window.location.href = "/driver-login"}
                  className="w-full"
                >
                  Continue to Sign In
                </Button>
              </div>
            ) : isIOS ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Install Driver App</h2>
                <p className="text-gray-400 mb-4">
                  To install on iPhone/iPad:
                </p>
                <ol className="text-left text-sm text-gray-300 space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">1</span>
                    Tap the <strong>Share</strong> button in Safari
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">2</span>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">3</span>
                    Tap <strong>"Add"</strong> to confirm
                  </li>
                </ol>
                <Button 
                  onClick={() => window.location.href = "/driver-login"}
                  variant="secondary"
                  className="w-full"
                >
                  Skip and Sign In
                </Button>
              </div>
            ) : deferredPrompt ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Download className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Install Driver App</h2>
                <p className="text-gray-400 mb-4">
                  Install the app for quick access to your collection jobs.
                </p>
                <Button onClick={handleInstall} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Install App
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Truck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Driver App</h2>
                <p className="text-gray-400 mb-4">
                  Use your browser menu to install this app, or continue to sign in.
                </p>
                <Button 
                  onClick={() => window.location.href = "/driver-login"}
                  className="w-full"
                >
                  Continue to Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
