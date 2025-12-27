import { MainLayout } from "@/components/layout/MainLayout";
import { CalDAVSettings } from "@/components/calendar/CalDAVSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Settings, User, Bell, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">설정</h1>
          <p className="text-muted-foreground">앱 설정 및 외부 서비스 연동을 관리합니다</p>
        </div>

        <Tabs defaultValue="calendars" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendars" className="gap-2">
              <Calendar className="h-4 w-4" />
              캘린더 연동
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              알림
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              프로필
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              일반
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendars">
            <Card>
              <CardHeader>
                <CardTitle>캘린더 연동</CardTitle>
                <CardDescription>
                  외부 캘린더 서비스와 연동하여 일정을 동기화합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CalDAVSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>알림 설정</CardTitle>
                <CardDescription>
                  알림 수신 방법과 타이밍을 설정합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">알림 설정 기능 준비 중...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>프로필 설정</CardTitle>
                <CardDescription>
                  개인 정보와 프로필 사진을 관리합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">프로필 설정 기능 준비 중...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>일반 설정</CardTitle>
                <CardDescription>
                  앱의 기본 동작을 설정합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">일반 설정 기능 준비 중...</p>
                </div>

                <div className="pt-6 border-t border-destructive/20">
                  <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    계정을 탈퇴하면 모든 개인 정보가 삭제되며 복구할 수 없습니다. 탈퇴 후에도 동일한 이메일로 다시 가입할 수 있습니다.
                  </p>

                  <AccountWithdrawalButton />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function AccountWithdrawalButton() {
  const { deleteUserAccount } = useAuth();

  const handleDelete = async () => {
    const { error } = await deleteUserAccount();
    if (error) {
      if ((error as any).code === 'auth/requires-recent-login') {
        toast.error("보안을 위해 다시 로그인한 후 탈퇴를 진행해주세요.");
      } else {
        toast.error("회원 탈퇴 중 오류가 발생했습니다: " + error.message);
      }
    } else {
      toast.success("회원 탈퇴가 완료되었습니다.");
      // Redirect happens automatically as Auth state changes
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">회원 탈퇴</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            계정을 삭제하면 프로필과 설정이 즉시 제거됩니다. 이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            탈퇴하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
