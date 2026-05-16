"use client";

export default function TermsPage() {
  return (
    <div className="bg-[#050505] pt-16">
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="animate-in fade-in mb-8 text-4xl font-bold tracking-tight text-white duration-700">
            Terms of Service
          </h1>
          <div className="animate-in fade-in space-y-6 text-sm leading-relaxed text-zinc-400 delay-100 duration-700">
            <p>
              These Terms of Service govern your use of the KnotEngine platform
              and related services.
            </p>
            <h2 className="text-lg font-semibold text-white">1. Acceptance</h2>
            <p>
              By accessing or using KnotEngine, you agree to be bound by these
              terms. If you do not agree, do not use the service.
            </p>
            <h2 className="text-lg font-semibold text-white">2. Service</h2>
            <p>
              KnotEngine provides non-custodial payment infrastructure. We do
              not hold, store, or manage your private keys or cryptocurrency
              funds.
            </p>
            <h2 className="text-lg font-semibold text-white">
              3. Limitation of Liability
            </h2>
            <p>
              KnotEngine is provided &quot;as is&quot; without warranty of any
              kind. We are not liable for any losses arising from the use of our
              service.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
