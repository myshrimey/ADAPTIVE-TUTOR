import { redirect } from 'next/navigation';

// The old offer page. Plans, prices and payment now live at /plans (v54); this keeps old links working.
export default function PilotRedirect() {
  redirect('/plans');
}
