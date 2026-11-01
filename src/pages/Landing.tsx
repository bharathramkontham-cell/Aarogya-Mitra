import { Button, Card } from '../components/ui';
import { Logo } from '../components/Logo';

export function Landing() {
  return (
    <div className="page-wrap">
      <header className="bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <nav className="flex gap-3 text-sm font-semibold text-slate-700">
            <a href="#how" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">
              How It Works
            </a>
            <a href="#privacy" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">
              Privacy
            </a>
            <a href="#caregiver" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">
              Caregiver Support
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="text-center">
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Aarogya Mitra
            <br />
            <span className="text-teal-600">ఆరోగ్య మిత్ర</span>
          </h1>
          <p className="mt-4 text-xl font-semibold text-slate-600">
            Your trusted companion for every medicine time.
          </p>
          <p className="mt-3 max-w-xl mx-auto text-base text-slate-500">
            A privacy-first medication reminder and dose tracking app that helps you remember the right medicine at the right time.
          </p>

          <div className="mt-6 flex flex-col gap-3 justify-center sm:flex-row sm:justify-center">
            <Button size="md">Get Started</Button>
            <Button variant="secondary" size="md">Sign In</Button>
            <Button variant="ghost" size="md">How It Works</Button>
            <Button variant="ghost" size="md">Privacy</Button>
            <Button variant="ghost" size="md">Caregiver Support</Button>
          </div>

          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Aarogya Mitra is a reminder and tracking tool. It does not provide medical advice or replace a pharmacist or clinician.
          </p>
        </section>

        <section id="how" className="mt-16 rounded-xl border border-primary-200 bg-white p-6 text-center">
          <h2 className="text-2xl font-bold text-primary-700">How It Works</h2>
          <p className="mt-3 max-w-2xl mx-auto text-slate-600">
            Add your medicines, set the times you need to take them, and log each dose. The app reminds you, tracks refills, and lets you share only the details you choose with a caregiver. 
          </p>
          <div className="mt-6 grid gap-4 text-left sm:grid-cols-3">
            <Card>
              <h3 className="font-semibold text-primary-700">1. Add medicines</h3>
              <p className="mt-1 text-sm text-slate-600">Enter the medicine name, strength, how often to take it, and the time.</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-teal-700">2. Get reminders</h3>
              <p className="mt-1 text-sm text-slate-600">Receive gentle reminders for each dose and refill.</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-success-700">3. Track doses</h3>
              <p className="mt-1 text-sm text-slate-600">Log taken, skipped, or missed doses and see your progress.</p>
            </Card>
          </div>
        </section>

        <section id="privacy" className="mt-12 rounded-xl border border-primary-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-primary-700">Privacy</h2>
          <p className="mt-3 text-slate-600">
            Your health information stays private. You control what is saved, and you can export or delete your data at any time. Caregivers can see only the exact information you share.
          </p>
        </section>

        <section id="caregiver" className="mt-12 rounded-xl border border-primary-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-primary-700">Caregiver Support</h2>
          <p className="mt-3 text-slate-600">
            Invite a caregiver to view only the information you choose, such as dose status or refill alerts. You can revoke access at any time.
          </p>
        </section>

        <section className="mt-12 rounded-xl border border-primary-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-primary-700">Project evidence</h2>
          <h3 className="mt-3 text-lg font-semibold text-slate-700">Problem statement</h3>
          <p className="mt-2 text-slate-600">
            Many people forget to take medicines on time, especially when they have multiple tablets, refills, and doctor follow-ups. Remembering every instruction can be difficult.
          </p>
          <h3 className="mt-4 text-lg font-semibold text-slate-700">User feedback summary</h3>
          <p className="mt-2 text-slate-600">
            Early reviewers said a simple reminder list, refill planning, and caregiver sharing would be helpful. Feedback was gathered with consent and without personal health information.
          </p>
          <h3 className="mt-4 text-lg font-semibold text-slate-700">Measurable outcomes</h3>
          <p className="mt-2 text-slate-600">
            The app is designed to improve on-time dose logging, refill awareness, and caregiver visibility of only the shared scope.
          </p>
          <h3 className="mt-4 text-lg font-semibold text-slate-700">Limitations</h3>
          <p className="mt-2 text-slate-600">
            This is a student project and proof of concept. Reminder delivery depends on browser or email settings. It does not replace professional medical advice.
          </p>
          <h3 className="mt-4 text-lg font-semibold text-slate-700">Future improvements</h3>
          <p className="mt-2 text-slate-600">
            Connect verified pharmacy or provider directories, improve reminder reliability, and add accessibility testing across devices.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <p>Aarogya Mitra is a reminder and tracking tool. It does not provide medical advice or replace a pharmacist or clinician.</p>
      </footer>
    </div>
  );
}
