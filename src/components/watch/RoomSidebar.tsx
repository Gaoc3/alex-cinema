import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage, RoomMember } from '@/hooks/useWatchRoom';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

interface RoomSidebarProps {
  roomId: string;
  initialPrivacy: boolean;
  members: RoomMember[];
  messages: ChatMessage[];
  sendChatMessage: (text: string) => Promise<{ ok: boolean; error?: string }>;
  isHost: boolean;
  kickUser: (socketId: string) => void;
  closeRoom: () => Promise<void>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type RoomTab = 'chat' | 'members' | 'settings';

export default function RoomSidebar({
  roomId,
  initialPrivacy,
  members,
  messages,
  sendChatMessage,
  isHost,
  kickUser,
  closeRoom,
  isOpen,
  setIsOpen,
}: RoomSidebarProps) {
  const [activeTab, setActiveTab] = useState<RoomTab>('chat');
  const [inputText, setInputText] = useState('');
  const [isPrivate, setIsPrivate] = useState(initialPrivacy);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [kickMemberTarget, setKickMemberTarget] = useState<RoomMember | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const hosts = members.filter((member) => member.isHost);
  const viewers = members.filter((member) => !member.isHost);

  useEffect(() => {
    if (!isOpen || window.innerWidth >= 1024) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    const frame = window.requestAnimationFrame(() => {
      const panel = chatScrollRef.current;
      if (panel) panel.scrollTop = panel.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, activeTab]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    const result = await sendChatMessage(inputText);
    if (result.ok) {
      setInputText('');
    } else {
      toast.error(result.error || 'تعذر إرسال الرسالة');
    }
    setIsSending(false);
  };

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ar-IQ', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ رابط الغرفة');
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleTogglePrivacy = async () => {
    if (!isHost || isToggling) return;
    setIsToggling(true);
    try {
      const { toggleRoomPrivacy } = await import('@/app/actions/room.actions');
      const nextPrivacy = !isPrivate;
      const result = await toggleRoomPrivacy(roomId, nextPrivacy);
      if (result.success) {
        setIsPrivate(nextPrivacy);
        toast.success(nextPrivacy ? 'أصبحت الغرفة خاصة' : 'أصبحت الغرفة عامة');
      } else {
        toast.error(result.error || 'فشل تغيير الخصوصية');
      }
    } catch {
      toast.error('تعذر تحديث إعدادات الغرفة');
    } finally {
      setIsToggling(false);
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (!isHost || isDeleting) return;
    setIsDeleting(true);
    try {
      const { deleteRoom } = await import('@/app/actions/room.actions');
      const result = await deleteRoom(roomId);
      if (result.success) {
        await closeRoom();
        toast.success('تم إغلاق الغرفة');
        window.location.href = '/rooms';
      } else {
        toast.error(result.error || 'تعذر حذف الغرفة');
      }
    } catch {
      toast.error('تعذر حذف الغرفة');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmKick = () => {
    if (!kickMemberTarget) return;
    kickUser(kickMemberTarget.id);
    setKickMemberTarget(null);
  };

  const tabs: Array<{ id: RoomTab; label: string; icon: string; count?: number }> = [
    { id: 'chat', label: 'الدردشة', icon: 'fa-message' },
    { id: 'members', label: 'الأعضاء', icon: 'fa-users', count: Math.max(members.length, 1) },
    { id: 'settings', label: 'الإعدادات', icon: 'fa-gear' },
  ];

  return (
    <>
      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="إغلاق الغرفة"
        message="سيخرج جميع المشاركين ولن يمكن استعادة هذه الجلسة. هل تريد المتابعة؟"
        confirmText="إغلاق الغرفة"
        isDangerous
      />
      <ConfirmModal
        isOpen={Boolean(kickMemberTarget)}
        onCancel={() => setKickMemberTarget(null)}
        onConfirm={handleConfirmKick}
        title="إخراج مشارك"
        message={`هل تريد إخراج ${kickMemberTarget?.name || 'هذا المشارك'} من الغرفة؟`}
        confirmText="إخراج"
        isDangerous
      />

      <button
        type="button"
        className={`fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setIsOpen(false)}
        aria-label="إغلاق لوحة الغرفة"
        tabIndex={isOpen ? 0 : -1}
      />

      <section
        className={`fixed inset-x-0 bottom-0 z-[120] flex h-[min(86svh,46rem)] min-h-0 w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#0b101a] shadow-[0_-20px_60px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out lg:sticky lg:top-4 lg:z-10 lg:h-[calc(100svh-6.25rem)] lg:min-h-[34rem] lg:max-h-[54rem] lg:translate-y-0 lg:rounded-2xl lg:shadow-2xl ${isOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        aria-label="لوحة الغرفة"
        aria-hidden={!isOpen ? undefined : false}
      >
        <div className="mx-auto mt-2 h-1 w-11 rounded-full bg-white/20 lg:hidden" aria-hidden="true" />

        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">مجلس الغرفة</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              جلسة مباشرة
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl bg-white/[0.06] text-slate-200 transition hover:bg-white/10 lg:hidden"
            aria-label="إغلاق اللوحة"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-1 border-b border-white/10 bg-black/15 p-2" role="tablist" aria-label="أقسام الغرفة">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
            >
              <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-red-400' : ''}`} aria-hidden="true" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{tab.count}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'chat' && (
          <div className="flex min-h-0 flex-1 flex-col" role="tabpanel">
            <div ref={chatScrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-lg text-slate-400">
                    <i className="fa-regular fa-comment-dots" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-slate-200">ابدأ المحادثة</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">ستبقى رسائل الغرفة ظاهرة عند إعادة تحميل الصفحة.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <article key={message.id} className="group">
                      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500/80 to-slate-700 text-[10px] font-black text-white">
                            {message.sender?.[0]?.toUpperCase() || 'U'}
                          </span>
                          <span className="truncate text-xs font-bold text-slate-200">{message.sender}</span>
                          {message.isHost && (
                            <span className="shrink-0 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              مضيف
                            </span>
                          )}
                        </div>
                        <time className="shrink-0 text-[10px] text-slate-500" dateTime={message.createdAt}>
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </div>
                      <p className="mr-9 max-w-[calc(100%-2.25rem)] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md border border-white/[0.07] bg-white/[0.055] px-3.5 py-2.5 text-[13px] leading-6 text-slate-100" dir="auto">
                        {message.text}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="flex items-end gap-2 border-t border-white/10 bg-[#0d131f] p-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={1000}
                rows={1}
                placeholder="اكتب رسالة..."
                aria-label="رسالة الدردشة"
                className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.055] px-3.5 py-3 text-[13px] leading-5 text-white outline-none placeholder:text-slate-500 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#e50914] text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={isSending ? 'جارٍ إرسال الرسالة' : 'إرسال الرسالة'}
              >
                <i className={`fa-solid ${isSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} aria-hidden="true" />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" role="tabpanel">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-black text-white">المشاركون الآن</h3>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                {Math.max(members.length, 1)} متصل
              </span>
            </div>

            <div className="space-y-2">
              {[...hosts, ...viewers].map((member) => (
                <div key={member.id} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${member.isHost ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-red-500/80 to-slate-700'}`}>
                      {member.name?.[0]?.toUpperCase() || 'U'}
                      {member.isHost && <i className="fa-solid fa-crown absolute -top-1 -right-1 text-[9px] text-amber-200" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-100">{member.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{member.isHost ? 'المضيف' : 'مشاهد'}</p>
                    </div>
                  </div>
                  {isHost && !member.isHost && (
                    <button
                      type="button"
                      onClick={() => setKickMemberTarget(member)}
                      className="min-h-10 shrink-0 cursor-pointer rounded-xl px-3 text-xs font-bold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      إخراج
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4" role="tabpanel">
            <button
              type="button"
              onClick={copyInviteLink}
              className="flex min-h-14 w-full cursor-pointer items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-right transition hover:bg-white/[0.075]"
            >
              <span>
                <span className="block text-sm font-bold text-white">دعوة الأصدقاء</span>
                <span className="mt-1 block text-[11px] text-slate-400">نسخ رابط الغرفة</span>
              </span>
              <i className="fa-solid fa-link text-red-400" aria-hidden="true" />
            </button>

            <div className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">غرفة خاصة</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">إخفاؤها من قائمة الغرف العامة</p>
              </div>
              <button
                type="button"
                onClick={handleTogglePrivacy}
                disabled={!isHost || isToggling}
                aria-pressed={isPrivate}
                aria-label="تبديل خصوصية الغرفة"
                className={`relative h-11 w-14 shrink-0 cursor-pointer rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${isPrivate ? 'bg-red-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-2.5 size-6 rounded-full bg-white shadow transition-transform ${isPrivate ? 'right-1.5' : 'right-6'}`} />
              </button>
            </div>

            {!isHost && (
              <p className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-xs leading-6 text-slate-400">
                إعدادات الخصوصية وإدارة المشاركين متاحة للمضيف فقط.
              </p>
            )}

            {isHost && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-extrabold text-red-300 transition hover:border-red-500/40 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="fa-solid fa-trash-can" aria-hidden="true" />
                {isDeleting ? 'جارٍ الإغلاق...' : 'إغلاق الغرفة'}
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
