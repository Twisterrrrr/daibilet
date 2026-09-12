import { redirect } from 'next/navigation';

/** Guest lookup page removed — use account purchases. */
export default function MyOrdersRedirectPage() {
  redirect('/account/purchases');
}
