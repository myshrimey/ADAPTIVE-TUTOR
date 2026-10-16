import { redirect } from 'next/navigation';
import { getMe, homeFor } from '@/lib/me';
import { HomeClient } from '@/components/HomeClient';

// The home page is for people who are NOT signed in yet (sign-in, plans, FAQ). Anyone who is
// already signed in is sent straight to where they belong, on the server, before this page is
// drawn, so a signed-in person never sees the sign-in or sign-up screen from any link.
export default async function Home() {
  let me = null;
  try {
    me = await getMe();
  } catch {
    me = null; // if the check itself fails, fall back to the normal page (it re-checks in the browser)
  }
  if (me) {
    const dest = homeFor(me);
    if (dest) redirect(dest);
  }
  // Signed in but with nowhere to be sent yet (still choosing subjects, or not an invited account).
  return <HomeClient signedIn={!!me} />;
}
