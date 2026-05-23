import { redirect } from 'next/navigation';

export default function AccountUsersRedirectPage() {
  redirect('/profile?open=users');
}
