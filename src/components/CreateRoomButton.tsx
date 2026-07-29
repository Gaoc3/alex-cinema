"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { toast } from 'react-hot-toast';

export default function CreateRoomButton({ className }: { className?: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { getToken } = useAuth();
  const { isSignedIn, user } = useUnifiedAuth();

  const handleCreateRoom = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCreating) return;

    if (!isSignedIn && !user) {
      toast.error('يجب تسجيل الدخول لإنشاء غرفة مشاهدة 🔒');
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading('جاري إنشاء غرفة المشاهدة...');

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'روم مشاهدة جماعية',
          isPrivate: false
        })
      });

      const data = await response.json();
      toast.dismiss(toastId);

      if (data.success && (data.room?.id || data.roomId)) {
        toast.success('تم إنشاء الغرفة بنجاح! 🍿');
        const roomId = data.room?.id || data.roomId;
        router.push(`/room/${roomId}?create=true`);
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إنشاء الغرفة');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('فشل الاتصال أثناء إنشاء الغرفة');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreateRoom}
      disabled={isCreating}
      className={className || "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black px-5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(229,9,20,0.5)] border border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"}
    >
      <i className="fa-solid fa-plus text-xs"></i>
      <i className="fa-solid fa-users text-sm"></i>
      <span>إنشاء غرفة جديدة</span>
    </button>
  );
}
