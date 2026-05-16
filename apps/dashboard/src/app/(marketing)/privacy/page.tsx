"use client";

export default function PrivacyPage() {
  return (
    <div className="bg-[#050505] pt-16">
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="animate-in fade-in mb-8 text-4xl font-bold tracking-tight text-white duration-700">
            Privacy Policy
          </h1>
          <div className="animate-in fade-in space-y-6 text-sm leading-relaxed text-zinc-400 delay-100 duration-700">
            <p>
              This Privacy Policy explains how KnotEngine collects, uses, and
              protects your information.
            </p>
            <h2 className="text-lg font-semibold text-white">
              1. Information We Collect
            </h2>
            <p>
              We collect only the information necessary to provide our service:
              email address, merchant profile details, and payment transaction
              data.
            </p>
            <h2 className="text-lg font-semibold text-white">
              2. How We Use Your Information
            </h2>
            <p>
              Your information is used solely to operate and improve the
              KnotEngine platform. We never sell your data to third parties.
            </p>
            <h2 className="text-lg font-semibold text-white">
              3. Data Security
            </h2>
            <p>
              We implement industry-standard security measures. However, as a
              non-custodial platform, we never have access to your private keys
              or funds.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
