"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const preparationOptions = ["Audit", "Month-end", "Due diligence", "Other"];

const dashboardCards = [
  "Transactions",
  "Documents",
  "Evidence Registry",
  "Missing Items",
  "Package Builder",
];

type Step = "landing" | "onboarding" | "dashboard";
type OnboardingSetup = {
  preparingFor: string;
  accountingSoftware: string;
  fiscalYear: string;
};

export default function Home() {
  const [initialSetup] = useState(readSavedSetup);
  const [step, setStep] = useState<Step>(
    initialSetup ? "dashboard" : "landing",
  );
  const [preparingFor, setPreparingFor] = useState(
    initialSetup?.preparingFor || "Audit",
  );
  const [accountingSoftware, setAccountingSoftware] = useState(
    initialSetup?.accountingSoftware || "",
  );
  const [fiscalYear, setFiscalYear] = useState(
    initialSetup?.fiscalYear || "",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(
      "auditready:onboarding",
      JSON.stringify({ preparingFor, accountingSoftware, fiscalYear }),
    );
    setStep("dashboard");
  }

  if (step === "dashboard") {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-6 py-8 text-[#172033] sm:px-10">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <header className="flex flex-col justify-between gap-5 border-b border-[#d9dde5] pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#55706d]">
                AuditReady
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#172033] sm:text-4xl">
                Readiness dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#5d6675]">
                Your workspace is set up for {preparingFor.toLowerCase()} using{" "}
                {accountingSoftware || "your accounting software"} for fiscal
                year {fiscalYear || "not set"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("onboarding")}
              className="h-11 rounded-md border border-[#c8ced8] px-4 text-sm font-semibold text-[#172033] transition hover:border-[#8f9aaa] hover:bg-white"
            >
              Edit setup
            </button>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardCards.map((card) => (
              <DashboardCard key={card} title={card} />
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-6 py-8 text-[#172033] sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <nav className="flex items-center justify-between border-b border-[#d9dde5] pb-5">
          <span className="text-lg font-semibold tracking-normal">
            AuditReady
          </span>
          {step === "onboarding" ? (
            <button
              type="button"
              onClick={() => setStep("landing")}
              className="h-10 rounded-md border border-[#c8ced8] px-4 text-sm font-semibold transition hover:border-[#8f9aaa] hover:bg-white"
            >
              Back
            </button>
          ) : null}
        </nav>

        {step === "landing" ? (
          <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.04fr_0.96fr]">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#55706d]">
                Close-ready accounting workflows
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-normal text-[#172033] sm:text-6xl">
                AuditReady
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#5d6675]">
                Start a focused workspace for your next audit, close, diligence
                request, or finance package.
              </p>
              <button
                type="button"
                onClick={() => setStep("onboarding")}
                className="mt-9 h-12 rounded-md bg-[#243b53] px-6 text-base font-semibold text-white shadow-[0_8px_20px_rgba(36,59,83,0.18)] transition hover:bg-[#1b2f44]"
              >
                Get Started
              </button>
            </div>

            <div className="rounded-md border border-[#d9dde5] bg-white p-6 shadow-[0_18px_50px_rgba(23,32,51,0.08)]">
              <div className="grid gap-3">
                {dashboardCards.slice(0, 4).map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-md border border-[#e3e7ed] px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[#263349]">
                      {item}
                    </span>
                    <span className="h-2 w-16 rounded-full bg-[#d7e2df]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center py-10">
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-md border border-[#d9dde5] bg-white p-6 shadow-[0_18px_50px_rgba(23,32,51,0.08)] sm:p-8"
            >
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#55706d]">
                  Workspace setup
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#172033] sm:text-4xl">
                  Tell us what to prepare.
                </h1>
              </div>

              <div className="mt-8 grid gap-7 lg:grid-cols-3">
                <fieldset>
                  <legend className="text-base font-semibold text-[#172033]">
                    What are you preparing for?
                  </legend>
                  <div className="mt-4 grid gap-3">
                    {preparationOptions.map((option) => (
                      <label
                        key={option}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-[#d9dde5] px-3 text-sm font-medium transition has-[:checked]:border-[#243b53] has-[:checked]:bg-[#eef4f2]"
                      >
                        <input
                          type="radio"
                          name="preparingFor"
                          value={option}
                          checked={preparingFor === option}
                          onChange={(event) =>
                            setPreparingFor(event.target.value)
                          }
                          className="size-4 accent-[#243b53]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="text-base font-semibold text-[#172033]">
                    What accounting software do you use?
                  </span>
                  <input
                    type="text"
                    value={accountingSoftware}
                    onChange={(event) =>
                      setAccountingSoftware(event.target.value)
                    }
                    placeholder="QuickBooks, Xero, NetSuite..."
                    required
                    className="mt-4 h-12 w-full rounded-md border border-[#c8ced8] bg-white px-4 text-base outline-none transition placeholder:text-[#8f98a7] focus:border-[#243b53] focus:ring-4 focus:ring-[#d7e2df]"
                  />
                </label>

                <label className="block">
                  <span className="text-base font-semibold text-[#172033]">
                    What fiscal year?
                  </span>
                  <input
                    type="text"
                    value={fiscalYear}
                    onChange={(event) => setFiscalYear(event.target.value)}
                    placeholder="2026"
                    required
                    className="mt-4 h-12 w-full rounded-md border border-[#c8ced8] bg-white px-4 text-base outline-none transition placeholder:text-[#8f98a7] focus:border-[#243b53] focus:ring-4 focus:ring-[#d7e2df]"
                  />
                </label>
              </div>

              <div className="mt-8 flex justify-end border-t border-[#e3e7ed] pt-6">
                <button
                  type="submit"
                  className="h-12 rounded-md bg-[#243b53] px-6 text-base font-semibold text-white shadow-[0_8px_20px_rgba(36,59,83,0.18)] transition hover:bg-[#1b2f44]"
                >
                  Create dashboard
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

function DashboardCard({ title }: { title: string }) {
  const className =
    "block min-h-44 rounded-md border border-[#d9dde5] bg-white p-5 shadow-[0_1px_2px_rgba(23,32,51,0.04)] transition hover:border-[#b9c0cb] hover:shadow-[0_10px_24px_rgba(23,32,51,0.08)]";

  const content = (
    <>
      <h2 className="text-lg font-semibold text-[#172033]">{title}</h2>
      <div className="mt-8 h-2 w-16 rounded-full bg-[#d9dde5]" />
    </>
  );

  if (title === "Documents") {
    return (
      <Link href="/documents" className={className} aria-label="Open Documents">
        {content}
      </Link>
    );
  }

  return <section className={className}>{content}</section>;
}

function readSavedSetup(): OnboardingSetup | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedSetup = window.localStorage.getItem("auditready:onboarding");

  if (!savedSetup) {
    return null;
  }

  try {
    const parsedSetup = JSON.parse(savedSetup) as Partial<OnboardingSetup>;

    return {
      preparingFor: parsedSetup.preparingFor || "Audit",
      accountingSoftware: parsedSetup.accountingSoftware || "",
      fiscalYear: parsedSetup.fiscalYear || "",
    };
  } catch {
    window.localStorage.removeItem("auditready:onboarding");
    return null;
  }
}
