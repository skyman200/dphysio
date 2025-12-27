import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudOff } from "lucide-react";

export function CalDAVSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>외부 캘린더 연동</CardTitle>
          <CardDescription>
            Apple Calendar 등 외부 캘린더와의 연동 기능입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <CloudOff className="h-12 w-12 mb-4 opacity-50" />
          <h4 className="text-lg font-medium mb-2">현재 사용할 수 없음</h4>
          <p className="max-w-md">
            시스템 업그레이드(Supabase → Firebase 전환)로 인해 캘린더 연동 기능을 준비 중입니다.
            <br />
            추후 업데이트될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
