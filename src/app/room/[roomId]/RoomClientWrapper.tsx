'use client';

import React, { useEffect, useState } from 'react';
import RoomPlayerUI from '@/components/watch/RoomPlayerUI';
import { useRouter } from 'next/navigation';
import { useWatchRoom } from '@/hooks/useWatchRoom';
import LobbySearch from './LobbySearch';
import RoomSidebar from '@/components/watch/RoomSidebar';
import { getVideoImageUrl } from '@/utils/imageHelper';
import { useUser } from '@clerk/nextjs';

interface RoomClientWrapperProps {
  roomId: string;
  roomData: any;
  currentUserId: string | null;
  isHostUser: boolean;
  video: any;
  seasons: any[];
  episodes: any[];
}

export default function RoomClientWrapper({ 
  roomId, 
  roomData, 
  currentUserId, 
  isHostUser, 
  video, 
  seasons, 
  episodes 
}: RoomClientWrapperProps) {
  const { user, isLoaded } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  // Auto-resolve username from Clerk user session automatically without any modal prompt!
  const username = user 
    ? (user.fullName || user.firstName || user.username || 'مشاهد')
    : (isHostUser && roomData.host?.name ? roomData.host.name : `ضيف ${roomId.slice(0, 4)}`);

  // Auto-open sidebar on desktop screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Call the watch room hook unconditionally with auto-bound username
  const roomHook = useWatchRoom(roomId, isHostUser, username, video?.nb);
  
  useEffect(() => {
    if (roomHook.remoteVideoId && !video) {
      router.push(`/room/${roomId}?videoId=${roomHook.remoteVideoId}`);
    }
  }, [roomHook.remoteVideoId, video, roomId, router]);

  if (!isLoaded) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (roomHook.isKicked) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center p-10 bg-[#0c101c] border border-red-500/30 rounded-3xl max-w-md w-full shadow-2xl">
          <i className="fa-solid fa-ban text-6xl text-[#e50914] mb-4"></i>
          <h1 className="text-2xl font-black text-white mb-2">تم طردك من الغرفة</h1>
          <p className="text-gray-400 text-sm mb-6">لقد قام المضيف بطردك من هذه الغرفة.</p>
          <button 
            onClick={() => router.push('/movies')} 
            className="px-6 py-2.5 bg-[#e50914] hover:bg-[#b91c1c] text-white font-extrabold rounded-xl transition-all shadow-[0_4px_15px_rgba(229,9,20,0.5)] cursor-pointer"
          >
            تصفح المحتوى
          </button>
        </div>
      </div>
    );
  }

  const bgImage = video ? getVideoImageUrl(video) : null;

  return (
    <div className="w-full min-h-[calc(100vh-80px)] relative bg-[#050505] overflow-hidden">
      {/* Ambient Dynamic Background */}
      {bgImage ? (
        <div 
          className="absolute inset-0 z-0 opacity-[0.15] blur-[100px] scale-110"
          style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        ></div>
      ) : (
        <div className="absolute inset-0 z-0 opacity-20 blur-[100px] bg-gradient-to-br from-red-950 via-[#050505] to-slate-950"></div>
      )}
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full pt-20 sm:pt-24 lg:pt-28">
      
      {/* Room Header Overlay */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 mb-6 flex items-center justify-between bg-black/40 border border-white/10 p-4 rounded-2xl relative z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e50914] flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.5)]">
            <i className="fa-solid fa-users text-lg"></i>
          </div>
          <div>
            <h2 className="text-white font-bold">{roomData.title || 'غرفة المشاهدة الجماعية'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-gray-400 text-xs font-en tracking-wider truncate max-w-[160px] sm:max-w-none">{roomId}</p>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('تم نسخ رابط الغرفة بنجاح! 📋');
                  }
                }}
                className="bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="نسخ رابط الغرفة"
              >
                <i className="fa-solid fa-copy text-[9px] text-[#E50914]"></i>
                <span>نسخ الرابط</span>
              </button>
            </div>
          </div>
        </div>

        {/* Member Avatars Stack */}
        <div 
          className="flex items-center -space-x-2 space-x-reverse cursor-pointer hover:scale-105 transition-transform" 
          onClick={() => setIsSidebarOpen(true)}
          title="عرض قائمة الأعضاء"
        >
          {roomHook.members.slice(0, 5).map(m => (
            <div key={m.id} className="w-9 h-9 rounded-full border-2 border-[#0b0f19] bg-gradient-to-tr from-red-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold relative group shadow-md">
              {m.name?.[0]?.toUpperCase() || 'U'}
              {m.isHost && <i className="fa-solid fa-crown absolute -top-2 -right-1 text-[9px] text-yellow-400 drop-shadow"></i>}
            </div>
          ))}
          {roomHook.members.length > 5 && (
            <div className="w-9 h-9 rounded-full border-2 border-[#0b0f19] bg-gray-800 flex items-center justify-center text-white text-xs font-bold shadow-md">
              +{roomHook.members.length - 5}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isHostUser ? (
            <>
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-crown text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"></i> أنت المضيف
              </span>
              <button
                onClick={async () => {
                  if (confirm('هل أنت متأكد من إغلاق وحذف هذه الغرفة نهائياً؟')) {
                    const { deleteRoom } = await import('@/app/actions/room.actions');
                    const res = await deleteRoom(roomId);
                    if (res.success) {
                      toast.success('تم حذف الغرفة نهائياً 🗑️');
                      window.location.href = '/rooms';
                    } else {
                      toast.error(res.error || 'حدث خطأ أثناء حذف الغرفة');
                    }
                  }
                }}
                className="bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                title="حذف وإغلاق الغرفة"
              >
                <i className="fa-solid fa-trash-can text-[10px]"></i>
                <span className="hidden sm:inline">حذف الغرفة</span>
              </button>
            </>
          ) : (
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
              <i className="fa-solid fa-user"></i> مشاهد
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-screen-2xl mx-auto px-4 sm:px-8 gap-0 lg:gap-2 pb-10 items-start">
        
        {/* Sidebar Panel */}
        <RoomSidebar 
          roomId={roomId}
          initialPrivacy={roomData?.isPrivate ?? false}
          members={roomHook.members} 
          messages={roomHook.messages}
          sendChatMessage={roomHook.sendChatMessage}
          isHost={isHostUser} 
          kickUser={roomHook.kickUser} 
          myId={roomHook.socket?.id} 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        
        {/* Main Video/Lobby Container */}
        <div className="flex-1 min-w-0 transition-all duration-300 w-full relative">
          {!video ? (
            <div className="w-full relative z-20 mt-4">
              <div className="bg-[#0b0f19] border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-700"></div>
                
                <div className="w-20 h-20 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(229,9,20,0.3)]">
                  <i className="fa-solid fa-film text-3xl text-red-500"></i>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-white mb-4">الغرفة جاهزة!</h3>
                
                {isHostUser ? (
                  <>
                    <p className="text-gray-300 mb-8 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
                      أنت المضيف لهذه الغرفة. ابحث عن أي فيلم أو مسلسل في مكتبة الموقع لاختياره والبدء فوراً:
                    </p>
                    <LobbySearch roomId={roomId} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <p className="text-gray-300 mb-6 text-base sm:text-lg">في انتظار المضيف لاختيار الفيلم أو المسلسل...</p>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full pb-10">
              <RoomPlayerUI 
                video={video} 
                seasons={seasons} 
                episodes={episodes}
                roomHook={roomHook}
              />
              
              {isHostUser && (
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 mt-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-red-600 to-rose-700"></div>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-film text-red-500"></i>
                    تغيير الفيلم أو المسلسل
                  </h3>
                  <LobbySearch roomId={roomId} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Mobile Floating Chat FAB */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 left-6 z-50 bg-[#E50914] hover:bg-[#b8070f] text-white p-3.5 rounded-full shadow-[0_4px_25px_rgba(229,9,20,0.7)] border border-white/20 flex items-center justify-center gap-2 font-black text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="فتح المحادثة والأعضاء"
      >
        <i className="fa-solid fa-comments text-lg"></i>
        <span className="hidden sm:inline font-bold">دردشة الغرفة</span>
        {roomHook.messages.length > 0 && (
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></span>
        )}
      </button>
      </div>
    </div>
  );
}
