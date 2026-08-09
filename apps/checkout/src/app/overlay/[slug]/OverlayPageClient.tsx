"use client";

import React, { useState, useEffect, useCallback } from "react";

interface DonationAlert {
  id: string;
  donor_name: string;
  amount_usd: number;
  currency: string;
  message: string;
  alert_color: string;
  alert_duration: number;
  alert_sound_url?: string;
  created_at: string;
}

interface OverlayConfig {
  slug: string;
  alertColor: string;
  alertDuration: number;
  alertSoundUrl?: string;
  showAlert: boolean;
}

export default function OverlayPageClient({ slug }: { slug: string }) {
  const [config] = useState<OverlayConfig>({
    slug,
    alertColor: "#10b981",
    alertDuration: 5,
    showAlert: true,
  });
  const [currentAlert, setCurrentAlert] = useState<DonationAlert | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAudio(new Audio());
    }
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(
    (soundUrl?: string) => {
      if (!audio) return;
      audio.src = soundUrl || "/sounds/donation-alert.mp3";
      audio.volume = 0.7;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    },
    [audio],
  );

  // Fetch new alerts
  useEffect(() => {
    if (!config.showAlert) return;

    let lastCheck = new Date().toISOString();

    const checkForAlerts = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/v1/donations/${slug}/alerts?since=${lastCheck}`,
        );

        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            // Show the newest alert
            const newest = data.data[0];
            setCurrentAlert(newest);
            setIsAnimating(true);
            playAlertSound(newest.alert_sound_url);

            // Clear alert after duration
            setTimeout(
              () => {
                setIsAnimating(false);
                setTimeout(() => {
                  setCurrentAlert(null);
                }, 500);
              },
              (newest.alert_duration || config.alertDuration) * 1000,
            );

            // Mark as read
            await fetch(
              `${API_BASE_URL}/v1/donations/${slug}/alerts/${newest.id}/read`,
              { method: "POST" },
            );
          }
          lastCheck = new Date().toISOString();
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };

    const interval = setInterval(checkForAlerts, 3000);
    checkForAlerts();

    return () => clearInterval(interval);
  }, [slug, config, API_BASE_URL, playAlertSound]);

  // Demo mode: trigger alert on click
  const triggerDemoAlert = () => {
    const demoAlert: DonationAlert = {
      id: "demo_" + Date.now(),
      donor_name: "Demo Donor",
      amount_usd: 25.0,
      currency: "BTC",
      message: "Keep up the great work!",
      alert_color: config.alertColor,
      alert_duration: config.alertDuration,
      created_at: new Date().toISOString(),
    };
    setCurrentAlert(demoAlert);
    setIsAnimating(true);
    playAlertSound(config.alertSoundUrl);

    setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setCurrentAlert(null);
      }, 500);
    }, config.alertDuration * 1000);
  };

  if (!currentAlert) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="font-mono text-sm text-white/50">
          Waiting for donations...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-transparent">
      {/* Alert Container */}
      <div
        className={`relative transform transition-all duration-500 ease-out ${isAnimating ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"} `}
        onClick={triggerDemoAlert}
      >
        {/* Glow Effect */}
        <div
          className="absolute -inset-4 animate-pulse rounded-2xl opacity-50 blur-xl"
          style={{ backgroundColor: currentAlert.alert_color }}
        />

        {/* Main Alert Card */}
        <div
          className="relative max-w-[400px] min-w-[320px] rounded-2xl border border-zinc-700/50 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-sm"
          style={{
            boxShadow: `0 0 60px ${currentAlert.alert_color}40`,
          }}
        >
          {/* Donation Icon */}
          <div className="mb-4 flex items-center gap-4">
            <div
              className="flex h-12 w-12 animate-bounce items-center justify-center rounded-xl"
              style={{ backgroundColor: `${currentAlert.alert_color}30` }}
            >
              <span className="text-2xl">💝</span>
            </div>
            <div>
              <div className="text-sm tracking-wider text-white/60 uppercase">
                New Donation
              </div>
              <div
                className="text-2xl font-bold"
                style={{ color: currentAlert.alert_color }}
              >
                ${currentAlert.amount_usd.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Donor Name */}
          <div className="mb-2 text-xl font-semibold text-white">
            {currentAlert.donor_name}
          </div>

          {/* Message */}
          {currentAlert.message && (
            <div className="mb-4 rounded-lg bg-zinc-800/50 p-3">
              <div className="text-sm leading-relaxed text-zinc-300 italic">
                &ldquo;{currentAlert.message}&rdquo;
              </div>
            </div>
          )}

          {/* Currency Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              via {currentAlert.currency}
            </span>
            <div
              className="h-2 w-2 animate-ping rounded-full"
              style={{ backgroundColor: currentAlert.alert_color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
