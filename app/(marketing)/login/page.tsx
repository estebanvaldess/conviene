import Link from 'next/link';
import { PROFILE_COPY } from '@/lib/copy/profile-onboarding';
export default function LoginPage() { return <main className="shell"><section className="card"><h1>{PROFILE_COPY.landing.login}</h1><form><label>{PROFILE_COPY.gate.emailLabel}<input type="email" aria-describedby="login-error" /></label><button>{PROFILE_COPY.landing.login}</button><p id="login-error" /></form><Link href="/">{PROFILE_COPY.landing.title}</Link></section></main>; }
