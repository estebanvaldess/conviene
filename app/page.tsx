import OnboardingFlow from './onboarding-flow';
import { PROFILE_COPY } from '@/lib/copy/profile-onboarding';
export default function Home() { return <OnboardingFlow copy={PROFILE_COPY} />; }
