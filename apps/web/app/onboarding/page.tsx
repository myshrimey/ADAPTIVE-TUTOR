import { redirect } from 'next/navigation';

// Onboarding now lives on the home page ("/") — no separate click-through.
// This redirect exists only so an old bookmark or shared link doesn't 404.
export default function OnboardingRedirect() {
  redirect('/');
}
