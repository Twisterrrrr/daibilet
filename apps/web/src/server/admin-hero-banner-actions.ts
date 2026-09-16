'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

export async function setHeroBannerActiveAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const isActive = formData.get('isActive') === 'true';
  if (!id) redirect('/admin/hero-banners?error=1');

  await prisma.heroBanner.update({
    where: { id },
    data: { isActive },
  });

  revalidateTag('hero-banners');
  revalidatePath('/');
  revalidatePath('/admin/hero-banners');
  redirect('/admin/hero-banners?ok=1');
}
