import React, { useState, useRef, useEffect } from 'react';
import { RoomMember, ChatMessage } from '@/hooks/useWatchRoom';
import toast from 'react-hot-toast';

interface RoomSidebarProps {
  roomId: string;
  initialPrivacy: boolean;
  members: RoomMember[];
  messages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  isHost: boolean;
  kickUser: (socketId: string) => void;
  myId?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function RoomSidebar({ 
  roomId, 
  initialPrivacy, 
  members, 
  messages,
  sendChatMessage,
  isHost, 
  kickUser, 
  myId, 
  isOpen, 
  setIsOpen 
}: RoomSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'settings'>('chat');
  const [inputText, setInputText] = useState('');
  const [isPrivate, setIsPrivate] = useState(initialPrivacy);
  const [isToggling, setIsToggling] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hosts = members.filter(m => m.isHost);
  const viewers = members.filter(m => !m.isHost);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText);
    setInputText('');
  };

  const handleTogglePrivacy = async () => {
    if (!isHost || isToggling) return;
    setIsToggling(true);
    try {
      const { toggleRoomPrivacy } = await import('@/app/actions/room.actions');
      const res = await toggleRoomPrivacy(roomId, !isPrivate);
      if (res.success) {
        setIsPrivate(!isPrivate);
        toast.success(`تم تغيير خصوصية الغرفة إلى ${!isPrivate ? 'خاصة' : 'عامة'} 🔒`);
      } else {
        toast.error(res.error || 'حدث خطأ أثناء تعديل الخصوصية');
      }
    } catch (err) {
      console.error(err);
      toast.error('فشل الاتصال بالخادم');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full lg:h-[750px] 
        bg-[#080808] lg:bg-[#0c101c]/80 backdrop-blur-3xl border-r border-white/10 lg:border-white/10 lg:rounded-3xl
        z-[70] lg:z-10 
        transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0 w-80 lg:w-80 lg:ml-6 lg:opacity-100' : '-translate-x-full w-80 lg:w-0 lg:translate-x-0 lg:ml-0 lg:opacity-0'}
        overflow-hidden flex flex-col shrink-0
      `}>
        <div className="w-80 h-full flex flex-col min-w-[20rem]" dir="rtl">
          {/* Header */}
          <div className="relative border-b border-white/10 bg-[#0c1120]">
            <div className="h-1 w-full bg-gradient-to-r from-[#E50914] via-rose-500 to-red-700"></div>
            <div className="p-4 flex items-center justify-between">
              <h3 className="text-white font-black flex items-center gap-2.5 text-sm sm:text-base">
                <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] shrink-0 shadow-[0_0_10px_rgba(229,9,20,0.3)]">
                  <i className="fa-solid fa-comments text-xs"></i>
                </div>
                <span>دردشة ومجلس الغرفة</span>
              </h3>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-[10px] font-black text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span>مباشر</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors lg:hidden">
                  <i className="fa-solid fa-times text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          {/* 3-Tab Bar */}
          <div className="flex bg-black/50 p-1 mx-3 mt-3 mb-2 rounded-xl border border-white/5 gap-1">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'chat' ? 'bg-[#E50914] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <i className="fa-solid fa-message text-[10px]"></i>
              دردشة
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'members' ? 'bg-[#E50914] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <i className="fa-solid fa-users text-[10px]"></i>
              الأعضاء ({members.length})
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'settings' ? 'bg-[#E50914] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <i className="fa-solid fa-gear text-[10px]"></i>
              الإدارة
            </button>
          </div>

          {/* Tab Content: Live Chat Panel */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0e1a]/90">
              {/* Chat Log Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-10 opacity-80">
                    <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center mb-3">
                      <i className="fa-solid fa-comments text-xl text-[#E50914]"></i>
                    </div>
                    <p className="text-xs font-bold text-white">لا توجد رسائل بعد</p>
                    <p className="text-[11px] text-gray-400 mt-1">ابدأ الدردشة والمحادثة مع الأصدقاء الآن!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/40 text-[9px] font-black text-red-400 flex items-center justify-center">
                            {msg.sender?.[0]?.toUpperCase() || 'U'}
                          </span>
                          <span className="text-gray-100 font-bold text-xs">{msg.sender}</span>
                          {msg.isHost && (
                            <span className="bg-yellow-500/20 border border-yellow-500/40 px-1.5 py-0.2 rounded text-[9px] text-yellow-300 font-bold flex items-center gap-1">
                              <i className="fa-solid fa-crown text-[8px]"></i>
                              مضيف
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-400 font-en tracking-tight">{msg.time}</span>
                      </div>
                      <div className="bg-[#141b2d] border border-white/15 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs text-white leading-relaxed break-words max-w-[95%] shadow-md">
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#0d1222] flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 bg-[#151c2e] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold placeholder-gray-400 outline-none focus:border-[#E50914] focus:bg-[#1a233a] transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-[#E50914] hover:bg-[#b8070f] active:scale-95 disabled:opacity-30 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-[0_0_12px_rgba(229,9,20,0.4)]"
                >
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                </button>
              </form>
            </div>
          )}

          {/* Tab Content: Members */}
          {activeTab === 'members' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              <div>
                <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">المضيفون ({hosts.length})</h4>
                <div className="space-y-2">
                  {hosts.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-red-950/20 border border-red-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold shrink-0 relative">
                          {member.name?.[0]?.toUpperCase() || 'U'}
                          <i className="fa-solid fa-crown absolute -top-1 -right-1 text-[10px] text-yellow-300"></i>
                        </div>
                        <span className="text-white text-xs font-bold">{member.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">المشاهدون ({viewers.length})</h4>
                  <div className="space-y-2">
                    {viewers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold shrink-0">
                            {member.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-white text-xs font-bold">{member.name}</span>
                        </div>
                        {isHost && (
                          <button 
                            onClick={() => { if(confirm(`طرد ${member.name}؟`)) kickUser(member.id); }}
                            className="text-red-400 hover:text-red-300 text-xs font-bold"
                          >
                            طرد
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Settings */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <h4 className="text-white font-bold text-xs border-b border-white/5 pb-2">إعدادات وإدارة الغرفة</h4>
                
                {/* Copy Invite Link */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-300 font-bold">رابط دعوة الأصدقاء</label>
                  <button 
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('تم نسخ رابط الغرفة بنجاح! 📋');
                      }
                    }}
                    className="w-full bg-[#E50914] hover:bg-[#b8070f] text-white py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                  >
                    <i className="fa-solid fa-link text-xs"></i>
                    <span>نسخ رابط الدعوة</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-200 font-bold">غرفة خاصة</span>
                    <span className="text-[10px] text-gray-400">إخفاء الروم من قائمة الرومات النشطة</span>
                  </div>
                  <button 
                    onClick={handleTogglePrivacy}
                    disabled={!isHost || isToggling}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isPrivate ? 'bg-[#E50914]' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isPrivate ? 'left-1' : 'right-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
