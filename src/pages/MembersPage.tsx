import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/hooks/useProfiles";

const colors = [
  "from-primary to-primary/70",
  "from-accent to-accent/70",
  "from-success to-success/70",
  "from-warning to-warning/70",
  "from-destructive to-destructive/70",
];

const MembersPage = () => {
  const { profiles, loading } = useProfiles();

  if (loading) {
    return (
      <MainLayout title="구성원">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="구성원">
      <div className="space-y-8">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-foreground">물리치료학과 교수진</h2>
            <p className="text-muted-foreground mt-1">총 {profiles.length}명의 구성원</p>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            아직 등록된 구성원이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((member, index) => (
              <div
                key={member.id}
                className="glass-card p-6 hover:shadow-2xl transition-all duration-300 animate-scale-in group"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-4 ring-background shadow-xl">
                      <AvatarFallback
                        className={cn(
                          "bg-gradient-to-br text-primary-foreground text-xl font-bold",
                          colors[index % colors.length]
                        )}
                      >
                        {member.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      {member.position && (
                        <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/20">
                          {member.position}
                        </Badge>
                      )}
                      {member.role && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {member.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-border/30 space-y-3">
                  {member.email && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.office && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <Building className="h-4 w-4 text-primary" />
                      <span>{member.office}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MembersPage;