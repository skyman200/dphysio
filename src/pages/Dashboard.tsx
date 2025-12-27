import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardEvent } from "@/types";
import { StatusFilterBar } from "@/components/dashboard/drill-down/StatusFilterBar";
import { PriorityTaskPanel } from "@/components/dashboard/drill-down/PriorityTaskPanel";
import { AIScheduleInput } from "@/components/dashboard/AIScheduleInput";
import { QuickNoticeInput } from "@/components/dashboard/drill-down/QuickNoticeInput";
import StoryBriefingModal from "@/components/dashboard/StoryBriefingModal";
import VoiceAssistant from "@/components/dashboard/VoiceAssistant";
import { useAuth } from '@/contexts/AuthContext';
import { useBriefingLogic } from "@/hooks/useBriefingLogic";
import { NewAnnouncementDialog } from "@/components/announcements/NewAnnouncementDialog";
import { useEvents } from '@/hooks/useEvents';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock } from 'lucide-react';

// Commander View Components
import { CdrHeroSection } from "@/components/dashboard/commander/CdrHeroSection";
import { CdrWeeklySchedule } from "@/components/dashboard/commander/CdrWeeklySchedule";
import { CdrStatusList } from "@/components/dashboard/commander/CdrStatusList";
import { CdrDeptStatus } from "@/components/dashboard/commander/CdrDeptStatus";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProfiles } from '@/hooks/useProfiles';
import { useResources } from '@/hooks/useResources';
import { useFileResources } from '@/hooks/useFileResources';
import { useAllMeetingItems } from '@/hooks/useMeetingItems';
import { ReservationDetailDialog } from "@/components/resources/ReservationDetailDialog";
import { StatisticsModal } from "@/components/dashboard/commander/StatisticsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const { dashboardEvents } = useDashboardData();
  const { deleteEvent, markAsRead } = useEvents();
  const { isOpen, briefingItems, confirmBriefing } = useBriefingLogic();
  const { user, profile } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'NOTICE' | null>(null);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<{
    id: string;
    title: string;
    content: string;
    category: string;
    type: "notice" | "file";
    date?: string | Date;
  } | null>(null);

  // Delete Confirmation State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<DashboardEvent | null>(null);
  const [viewReservation, setViewReservation] = useState<any>(null);

  // Data Hooks
  // Data Hooks
  const { resources, reservations, getResourceStatus } = useResources();
  const { resources: fileResources } = useFileResources();
  const { incompleteActions, recentDecisions } = useAllMeetingItems();
  const { profiles } = useProfiles();

  const totalFacultyCount = profiles.filter(p => p.role === '교수' || p.role === 'professor' || p.role === 'admin').length || 4;

  // PIN Verification State for Chief Access
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinContext, setPinContext] = useState<'activate' | 'stats'>('activate');
  const [isChiefVerified, setIsChiefVerified] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false); // Deprecated but kept for compatibility logic if needed
  const CHIEF_PIN = '@Rlarkdgns200';

  // Check if user has chief role but needs PIN verification
  const hasChiefRole = profile?.role === 'admin' || profile?.role === '교수' || profile?.role === 'professor' || profile?.role === '학과장';
  const isChief = hasChiefRole && isChiefVerified;

  // Count stats
  const counts = {
    urgent: dashboardEvents.filter(e => e.type === 'URGENT').length,
    notice: dashboardEvents.filter(e => e.type === 'NOTICE').length,
    all: dashboardEvents.length
  };

  // Find Active AND Upcoming Events for Hero Section
  const heroEvents = useMemo(() => {
    const now = new Date();

    // 1. Ongoing Events
    const active = dashboardEvents.filter(e => {
      // Safe Date Parsing
      const start = new Date(e.date);
      if (isNaN(start.getTime())) return false;

      const end = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 60 * 60 * 1000);
      return now >= start && now <= end;
    });

    // 2. Upcoming Events (Top 3)
    const upcoming = dashboardEvents
      .filter(e => {
        const start = new Date(e.date);
        if (isNaN(start.getTime())) return false;
        return start > now;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    return [...active, ...upcoming];
  }, [dashboardEvents]);

  // Find ALL Currently Active Resources
  const activeReservations = useMemo(() => {
    if (!resources.length || !reservations.length) return [];

    return resources
      .map(r => {
        const status = getResourceStatus(r.id);
        if (status.status === 'occupied' || status.status === 'partial') {
          return {
            ...status,
            resourceName: r.name,
            userName: profiles.find(p => p.user_id === status.reservation?.user_id)?.name || "Unknown"
          };
        }
        return null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [resources, reservations, getResourceStatus, profiles]);

  // Calculate real stats
  const deptStats = {
    calendarEvents: counts.all,
    urgentEvents: counts.urgent,
    meetings: incompleteActions.length + recentDecisions.length,
    resources: resources.length,
    reservations: reservations.length,
    announcements: counts.notice,
    files: fileResources.length,
  };

  // Recent news from real data
  const recentNews = dashboardEvents
    .filter(e => e.type === 'NOTICE')
    .slice(0, 3)
    .map(e => e.title);

  // Handlers
  const handleEdit = (e: DashboardEvent) => {
    setEditData({
      id: e.id,
      title: e.title,
      content: e.content,
      category: e.category,
      type: e.type === 'NOTICE' ? 'notice' : 'file',
      date: e.date
    });
    setIsEditOpen(true);
  };

  const handleDeleteRequest = (e: DashboardEvent) => {
    setEventToDelete(e);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (eventToDelete) {
      await deleteEvent(eventToDelete.id);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      toast.success("일정이 삭제되었습니다.");
    }
  };

  const handlePinVerify = () => {
    if (pinInput === CHIEF_PIN) {
      if (pinContext === 'activate') {
        setIsChiefVerified(true);
        sessionStorage.setItem('isChiefVerified', 'true');
        toast.success("학과장 권한이 활성화되었습니다.");
      } else {
        // Stats Context
        toast.success("통계 게시판으로 이동합니다.");
        navigate('/statistics');
      }
      setPinDialogOpen(false);
    } else {
      toast.error("비밀번호가 올바르지 않습니다.");
    }
    setPinInput('');
  };

  return (
    <MainLayout title="대시보드 🫡">
      <StoryBriefingModal
        isOpen={isOpen}
        items={briefingItems}
        onClose={confirmBriefing}
      />

      {/* Hero Section - Always Top, Full Width */}
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6 space-y-8 h-full overflow-y-auto scrollbar-hide">

        <DashboardHeader
          isChief={isChief}
          hasChiefRole={hasChiefRole || false}
          isChiefVerified={isChiefVerified}
          onPinVerifyOpen={() => {
            setPinContext('activate');
            setPinDialogOpen(true);
          }}
          onOpenStatistics={() => {
            if (!isChiefVerified) {
              toast.error("먼저 학과장 권한을 활성화해주세요.");
              return;
            }
            setPinContext('stats');
            setPinDialogOpen(true);
          }}
        />

        {/* 1. 사령관 뷰: 현재 상황판 (Hero Card) */}
        <CdrHeroSection
          events={heroEvents}
          activeReservations={activeReservations}
          isChief={isChief}
          totalFacultyCount={totalFacultyCount}
          onEnterMeeting={(e) => navigate(`/meetings`)}
          onViewReservation={(res) => setViewReservation(res)}
        />

        {/* 2. 유틸리티 바: AI 입력 & 퀵 공지 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-8">
            <AIScheduleInput />
          </div>
          <div className="md:col-span-4 h-full">
            <QuickNoticeInput />
          </div>
        </div>

        {/* 3. 메인 현황판: 필터 카드 + 학과 현황 (같은 높이) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 왼쪽: 필터 카드들 */}
          <div className="lg:col-span-2">
            <StatusFilterBar
              currentFilter={filter}
              onFilterChange={setFilter}
              counts={counts}
            />
          </div>

          {/* 오른쪽: 학과 현황 요약 */}
          <div className="lg:row-span-2">
            <CdrDeptStatus
              isChief={isChief}
              professorStatus={{
                present: profiles.filter(p => p.role === '교수' || p.role === 'professor').length,
                total: Math.max(profiles.filter(p => p.role === '교수' || p.role === 'professor').length, profiles.length)
              }}
              deptStats={deptStats}
            />
          </div>

          {/* 왼쪽 아래: 일정 리스트 */}
          <div className="lg:col-span-2 min-h-[300px]">
            {filter === null && (
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl">👆</div>
                  <p className="text-gray-500 font-medium">위 카드를 클릭하여 일정을 확인하세요</p>
                </div>
              </div>
            )}

            {filter === 'ALL' && (
              <PriorityTaskPanel
                tasks={dashboardEvents}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            )}

            {filter === 'URGENT' && (
              <CdrStatusList
                title="급박한 일정 상황"
                description="지금 바로 처리해야 하는 중요한 작전들입니다."
                events={dashboardEvents.filter(e => e.type === 'URGENT')}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            )}

            {filter === 'NOTICE' && (
              <CdrStatusList
                title="최신 하달 사항"
                description="교수진 및 학생회에 보고된 신규 공지입니다."
                events={dashboardEvents.filter(e => e.type === 'NOTICE')}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            )}
          </div>
        </div>

        {/* 추가 보조 정보 카드 */}
        <div className="bg-professor-burgundy/5 rounded-3xl p-6 border border-professor-burgundy/10 mt-6">
          <h4 className="text-sm font-black text-professor-burgundy mb-2 uppercase tracking-widest">학과장님께 보고된 최근 소식</h4>
          <ul className="space-y-2">
            {recentNews.length > 0 ? (
              recentNews.map((news, idx) => (
                <li key={idx} className="text-xs text-gray-600 font-medium flex gap-2">
                  <span className="text-professor-burgundy">•</span>
                  {news}
                </li>
              ))
            ) : (
              <>
                <li className="text-xs text-gray-600 font-medium flex gap-2">
                  <span className="text-professor-burgundy">•</span>
                  전체 일정: {deptStats.calendarEvents}건 등록
                </li>
                <li className="text-xs text-gray-600 font-medium flex gap-2">
                  <span className="text-professor-burgundy">•</span>
                  마감 임박 일정: {deptStats.urgentEvents}건
                </li>
                <li className="text-xs text-gray-600 font-medium flex gap-2">
                  <span className="text-professor-burgundy">•</span>
                  자료실 파일: {deptStats.files}개 업로드됨
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <NewAnnouncementDialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditData(null);
        }}
        initialData={editData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              "{eventToDelete?.title}"을(를) 정말 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Verification Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="text-indigo-500" size={20} />
              {pinContext === 'activate' ? '학과장 권한 활성화' : '통계 게시판 입장'}
            </DialogTitle>
            <DialogDescription>
              {pinContext === 'activate' ? '학과장 권한을 활성화하려면' : '통계 데이터를 확인하려면'} 비밀번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="비밀번호 입력"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinVerify()}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handlePinVerify} className="bg-indigo-500 hover:bg-indigo-600">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VoiceAssistant />

      {/* Detail Dialog for Active Reservation */}
      {viewReservation && (
        <ReservationDetailDialog
          isOpen={!!viewReservation}
          onClose={() => setViewReservation(null)}
          reservation={viewReservation.reservation}
          resourceName={viewReservation.resourceName}
          userName={viewReservation.userName}
        />
      )}

      {/* Statistics Modal (Chief Only) */}
      {/* Statistics Modal (Chief Only) */}
      {isStatsOpen && (
        <StatisticsModal
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
        />
      )}
    </MainLayout>
  );
}
