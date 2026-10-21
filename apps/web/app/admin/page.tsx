import { redirect } from 'next/navigation';

// The first screen of the admin area is the Founder Command Centre. The older detailed product dashboard is at /admin/overview.
export default function AdminHome() {
  redirect('/admin/command-centre');
}
