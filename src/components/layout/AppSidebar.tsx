import { Users, LayoutDashboard, LogOut, Building2, User, FileText, DoorOpen, Settings, BarChart3 } from "lucide-react";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useProfiles";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "대시보드", url: "/", icon: LayoutDashboard, badgeKey: "total" },
  { title: "학과 캘린더", url: "/department-calendar", icon: Building2 },
  { title: "교수 캘린더", url: "/professor-calendar", icon: User },
  { title: "회의·위원회", url: "/meetings", icon: Users, badgeKey: "actions" },
  { title: "공간 예약", url: "/resources", icon: DoorOpen },
  { title: "공지/자료실", url: "/announcements", icon: FileText },
  { title: "통계", url: "/statistics", icon: BarChart3, role: "chief" },
  { title: "설정", url: "/settings", icon: Settings },
];

// Warm user colors
const USER_COLORS = [
  "from-[hsl(12,70%,55%)] to-[hsl(12,70%,45%)]",
  "from-[hsl(350,45%,45%)] to-[hsl(350,45%,35%)]",
  "from-[hsl(152,55%,40%)] to-[hsl(152,55%,30%)]",
  "from-[hsl(38,85%,50%)] to-[hsl(38,85%,40%)]",
  "from-[hsl(280,50%,50%)] to-[hsl(280,50%,40%)]",
  "from-[hsl(330,60%,55%)] to-[hsl(330,60%,45%)]",
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { profiles, currentProfile } = useProfiles();
  const navigate = useNavigate();
  const { unreadMessagesCount, urgentActionsCount } = useNotifications();
  useSessionTracker(); // Start tracking session

  const isChief = currentProfile?.role === '학과장' || currentProfile?.role === 'chief';

  const totalBadge = unreadMessagesCount + urgentActionsCount;

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "total") return totalBadge;
    if (badgeKey === "actions") return urgentActionsCount;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r-0 glass-sidebar">
      <SidebarHeader className="p-6 border-b border-sidebar-border/30">
        <div className="flex items-center gap-4">
          {/* Logo with arch shape inspired by Pilates Circle */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border border-sidebar-border/30 shadow-lg">
            <img src="/logo.png" alt="물리치료학과" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-display text-sidebar-foreground text-xl tracking-tight">물리치료학과</h1>
            <p className="text-xs text-sidebar-foreground/40 font-light tracking-wide">Move, full circle.</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] uppercase tracking-[0.2em] mb-4 px-3 font-medium">
            메뉴
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {menuItems.map((item) => {
                if (item.role === "chief" && !isChief) return null;
                const badgeCount = getBadgeCount(item.badgeKey);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all duration-300"
                        activeClassName="bg-gradient-to-r from-sidebar-primary/25 to-sidebar-primary/10 text-sidebar-foreground shadow-lg shadow-sidebar-primary/10"
                      >
                        <item.icon className="h-5 w-5" strokeWidth={1.5} />
                        <span className="font-medium text-sm flex-1">{item.title}</span>
                        {/* Badge - dot mode for cleaner look */}
                        {badgeCount > 0 && (
                          <div className={cn(
                            "flex items-center justify-center",
                            badgeCount > 9
                              ? "min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
                              : "w-2 h-2 rounded-full bg-primary"
                          )}>
                            {badgeCount > 9 ? (badgeCount > 99 ? "99+" : badgeCount) : ""}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-10">
          <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] uppercase tracking-[0.2em] mb-4 px-3 font-medium">
            구성원
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              {profiles.slice(0, 6).map((profile, index) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sidebar-accent/30 transition-all duration-200 group"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-sidebar-accent/50">
                    <AvatarFallback className={`bg-gradient-to-br ${USER_COLORS[index % USER_COLORS.length]} text-white text-xs font-medium`}>
                      {profile.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90 transition-colors">
                    {profile.name}
                  </span>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-5 border-t border-sidebar-border/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-sidebar-primary/30">
            <AvatarImage src={currentProfile?.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-accent text-sidebar-primary-foreground font-display text-lg">
              {currentProfile?.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">
              {currentProfile?.name || "사용자"}
            </p>
            <p className="text-xs text-sidebar-foreground/40 font-light">
              {currentProfile?.role || "교수"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2.5 rounded-xl hover:bg-sidebar-accent/40 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-all duration-200"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}