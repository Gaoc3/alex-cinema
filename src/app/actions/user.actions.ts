"use server";

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/getAuthUser';

export async function syncUser() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (!dbUser) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user: dbUser };
  } catch (error) {
    console.error("Error syncing user:", error);
    return { success: false, error: 'حدث خطأ في الاتصال بقاعدة البيانات. الرجاء المحاولة لاحقاً.' };
  }
}
