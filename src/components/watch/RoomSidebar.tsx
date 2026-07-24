import React, { useState, useRef, useEffect } from 'react';
import { RoomMember, ChatMessage } from '@/hooks/useWatchRoom';

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
      } else {
        alert(res.error || 'حدث خطأ أثناء تعديل الخصوصية');
      }
    } catch (err) {
      console.error(err);
      alert('فشل الاتصال بالخادم');
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
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-black flex items-center gap-2 text-base">
              <i className="fa-solid fa-[#E50914] fa-comments text-red-500"></i> دردشة ومجلس الغرفة
            </h3>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors lg:hidden">
              <i className="fa-solid fa-times"></i>
            </button>
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
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Log Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-10 opacity-70">
                    <i className="fa-solid fa-comments text-4xl mb-2 text-red-500/40"></i>
                    <p className="text-xs font-bold text-gray-400">لا توجد رسائل بعد</p>
                    <p className="text-[10px] text-gray-500 mt-1">ابدأ الدردشة والمحادثة مع الأصدقاء الآن!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          {msg.sender}
                          {msg.isHost && (
                            <i className="fa-solid fa-crown text-[9px] text-yellow-400" title="المضيف"></i>
                          )}
                        </span>
                        <span className="text-[9px] text-gray-500">{msg.time}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-gray-200 leading-relaxed break-words max-w-[90%]">
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/60 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#E50914]/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-[#E50914] hover:bg-[#b8070f] disabled:opacity-40 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
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
                        alert('تم نسخ رابط الغرفة بنجاح!');
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
