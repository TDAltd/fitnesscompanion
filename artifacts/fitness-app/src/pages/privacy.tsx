import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

// DRAFT: have this reviewed by a lawyer before relying on it (Nigeria Data Protection Act 2023 / NDPR).
const UPDATED = "25 October 2026";
const CONTACT = "thedigitalagencyltd@gmail.com";

export default function PrivacyPage({ standalone = false }: { standalone?: boolean }) {
  return (
    <main className={standalone ? "onboarding-page min-h-[100dvh] px-4 py-10" : "pb-16"}>
      <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-relaxed">
        {standalone && (
          <div className="flex items-center justify-between">
            <Logo />
            <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-primary">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        )}
        <header>
          <h1 className="font-display text-3xl font-medium">Privacy notice</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </header>

        <Section title="Who we are">
          Fitness Companion is run by The Digital Agency Limited ("we"), which decides how your information is used. Questions or requests: {" "}
          <a className="font-semibold text-primary" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </Section>

        <Section title="What we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Account:</b> your email address and a scrambled (hashed) version of your password. We can't see your password.</li>
            <li><b>Your answers:</b> age, sex, height, weight, goal weight, activity level, fitness goal, food preference, training setup, sleep and schedule.</li>
            <li><b>What you log:</b> food, workouts and sets, weight, body measurements, steps, water and habits.</li>
            <li><b>Apple Health (only if you connect it):</b> daily steps and active calories sent by your iPhone Shortcut. We don't collect sleep data from your devices.</li>
            <li><b>Usage:</b> the days you open the app, which features you use, and your device's timezone, so days start at your midnight.</li>
          </ul>
          <p className="mt-2">Weight, body measurements and food can say something about your health. We only use them to run your plan and show your progress.</p>
        </Section>

        <Section title="Why we use it">
          To create your account and keep you signed in, build your personal plan and targets, show your progress, send emails you've asked for (password resets and, unless you switch it off, a weekly summary), keep the service secure, and understand which features are used so we can improve them. We rely on your consent, given when you sign up, and on running the service you asked for.
        </Section>

        <Section title="Who else sees it">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Our hosting provider</b> (Namecheap) stores the app and database.</li>
            <li><b>OpenAI</b> receives a meal photo or description only when you tap "Estimate calories". We don't store it, and by default OpenAI doesn't use API data to train its models.</li>
            <li><b>App admins</b> can see your email, sign-up date, goal, training setup and how often you use features, so they can support you and run the service. They can't see your weights, meals or measurements.</li>
          </ul>
          <p className="mt-2">We don't sell your information or use it for advertising.</p>
        </Section>

        <Section title="How long we keep it">
          Until you delete your account. Deleting your account (Me → Account → Delete my account) removes everything straight away. Server backups made by our host are overwritten within about 30 days.
        </Section>

        <Section title="Your rights">
          You can see and download your data (Me → Account → Download backup), correct it in the app, delete it, withdraw consent by deleting your account, and object to how it's used. Email us for anything else. If you're not happy with our answer, you can complain to the Nigeria Data Protection Commission (ndpc.gov.ng).
        </Section>

        <Section title="Security">
          Connections are encrypted (HTTPS), passwords are hashed, every request only reaches your own data, and sign-in attempts are limited. No system is perfect; if something goes wrong that affects you, we'll tell you.
        </Section>

        <Section title="Not medical advice">
          Plans and calorie numbers are general guidance, not medical advice. Talk to a doctor before big changes, especially if you're pregnant, under 18 or have a health condition. The app is meant for people aged 18 and over.
        </Section>

        <Section title="Changes">
          If we change this notice in a way that matters, we'll tell you in the app or by email.
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 font-display text-lg font-medium">{title}</h2>
      <div className="text-foreground/90">{children}</div>
    </section>
  );
}
