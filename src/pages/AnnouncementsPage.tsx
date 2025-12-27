import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Folder, Plus, Search, Download, Eye, Calendar, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEvents } from "@/hooks/useEvents";
import { useFileResources } from "@/hooks/useFileResources";
import { NewAnnouncementDialog } from "@/components/announcements/NewAnnouncementDialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AnnouncementsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("announcements");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const { events, deleteEvent } = useEvents();
  const { resources, deleteFile, loadMore, hasMore } = useFileResources();
  const { user } = useAuth();

  // Filter Notices (category === 'notice')
  const notices = events.filter(e => e.category === 'notice' || e.type === 'NOTICE');

  const filteredAnnouncements = notices.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = resources.filter((f) =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteNotice = async (id: string) => {
    if (confirm('공지사항을 삭제하시겠습니까?')) {
      await deleteEvent(id);
      toast.success('삭제되었습니다.');
    }
  };

  const handleEditNotice = (announcement: any) => {
    setEditData({
      id: announcement.id,
      title: announcement.title,
      content: announcement.description || '',
      category: announcement.category || '학사',
      type: 'notice'
    });
    setIsDialogOpen(true);
  };

  const handleDeleteFile = async (id: string, fileKey?: string) => {
    if (confirm('파일을 삭제하시겠습니까?')) {
      try {
        console.log('[Delete] Deleting file:', id, 'fileKey:', fileKey);
        await deleteFile(id, fileKey);
        toast.success('삭제되었습니다.');
      } catch (error: any) {
        console.error('[Delete] Error:', error);
        toast.error(`삭제 실패: ${error.message || '알 수 없는 오류'}`);
      }
    }
  };

  // 파일 다운로드 함수
  const handleDownload = async (e: React.MouseEvent, file: any) => {
    e.stopPropagation();

    try {
      toast.info('다운로드 준비 중...');

      // Fetch the file
      const response = await fetch(file.fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');

      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName || file.title || 'download';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('다운로드 완료!');
    } catch (error: any) {
      console.error('[Download] Error:', error);
      // Fallback: open in new tab
      window.open(file.fileUrl, '_blank');
    }
  };

  return (
    <MainLayout title="공지/자료실">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">공지/자료실</h2>
            <p className="text-muted-foreground">
              학과 공지사항 및 공유 자료를 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              새 글 작성
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="announcements" className="gap-2">
              <FileText className="h-4 w-4" />
              공지사항
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <Folder className="h-4 w-4" />
              자료실
            </TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="mt-6">
            <div className="space-y-3">
              {filteredAnnouncements.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white/50 rounded-xl border border-dashed">
                  등록된 공지사항이 없습니다.
                </div>
              ) : (
                <AnimatePresence>
                  {filteredAnnouncements.map((announcement, idx) => (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white/60 backdrop-blur-md border border-white/20 shadow-sm rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleEditNotice(announcement)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                              {announcement.type === 'NOTICE' ? '중요' : '공지'}
                            </Badge>
                            {/* We can infer sub-category from description or title tags if implemented later, or add a field */}
                          </div>
                          <h3 className="text-base font-medium text-foreground mt-1.5 truncate">
                            {announcement.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(announcement.start_date || announcement.created_at), "yyyy-MM-dd", { locale: ko })}
                            <span className="mx-1">|</span>
                            <span className="truncate max-w-[300px]">{announcement.description}</span>
                          </div>
                        </div>

                        {user?.uid === announcement.created_by && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditNotice(announcement);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotice(announcement.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="flex-shrink-0 text-gray-400">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-6">
            <div className="space-y-3">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white/50 rounded-xl border border-dashed">
                  등록된 자료가 없습니다.
                </div>
              ) : (
                filteredFiles.map((file, idx) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/60 backdrop-blur-md border border-white/20 shadow-sm rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => window.open(file.fileUrl, '_blank')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border flex items-center justify-center overflow-hidden">
                        {file.fileType?.startsWith('image/') ? (
                          <img src={file.fileUrl} alt={file.title} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {file.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">
                            {file.category}
                          </Badge>
                          <span>{(file.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                          <span>• {file.createdAt?.toDate ? format(file.createdAt.toDate(), "yyyy-MM-dd") : ""}</span>
                        </div>
                      </div>

                      {user?.uid === file.uploadedBy && (
                        <Button
                          variant="ghost" size="icon"
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id, file.fileKey);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 text-primary bg-primary/5 hover:bg-primary/10"
                        onClick={(e) => handleDownload(e, file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            {hasMore && activeTab === 'files' && !searchQuery && (
              <div className="flex justify-center pt-8 pb-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  className="rounded-full px-8 border-gray-200 text-gray-600 hover:bg-gray-50 bg-white/50 backdrop-blur-sm"
                >
                  더 보기
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <NewAnnouncementDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditData(null);
          }}
          defaultTab={activeTab === 'files' ? 'file' : 'notice'}
          initialData={editData}
        />
      </div>
    </MainLayout >
  );
};

export default AnnouncementsPage;
