// Event Notes Tab - 이벤트 상세 모달의 회의록 탭
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
    Pin, CheckSquare, Link2, Trash2, ExternalLink, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    useMeetingItems,
    MeetingItemType,
    MeetingItemStatus,
    MeetingItem
} from "@/hooks/useMeetingItems";
import { useProfiles } from "@/hooks/useProfiles";
import type { Profile } from "@/types";

interface EventNotesTabProps {
    eventId: string;
}

export function EventNotesTab({ eventId }: EventNotesTabProps) {
    const [showItemForm, setShowItemForm] = useState<MeetingItemType | null>(null);
    const [itemContent, setItemContent] = useState("");
    const [itemOwner, setItemOwner] = useState<string>("");
    const [itemDueDate, setItemDueDate] = useState("");

    const { profiles, currentProfile } = useProfiles();
    const { decisions, actions, links, addItem, updateItemStatus, deleteItem } = useMeetingItems(eventId);

    const getProfileById = (profileId: string): Profile | undefined => {
        return profiles.find((p: Profile) => p.id === profileId);
    };

    const handleAddItem = async () => {
        if (!itemContent.trim() || !showItemForm || !currentProfile) return;

        await addItem({
            type: showItemForm,
            content: itemContent.trim(),
            owner_id: itemOwner || undefined,
            due_at: itemDueDate || undefined,
            created_by: currentProfile.id,
        });

        toast.success("항목이 추가되었습니다");
        setShowItemForm(null);
        setItemContent("");
        setItemOwner("");
        setItemDueDate("");
    };

    const handleStatusChange = async (itemId: string, status: MeetingItemStatus) => {
        await updateItemStatus(itemId, status);
        toast.success("상태가 변경되었습니다");
    };

    return (
        <ScrollArea className="h-[400px]">
            <div className="p-6 space-y-6">
                {/* Decisions */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Pin className="h-4 w-4 text-professor-gold" />
                            결정사항 ({decisions.length})
                        </h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowItemForm("decision")}>
                            + 추가
                        </Button>
                    </div>
                    {decisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">결정사항이 없습니다</p>
                    ) : (
                        <div className="space-y-2">
                            {decisions.map((item: MeetingItem) => (
                                <div key={item.id} className="p-3 rounded-xl bg-professor-gold/10 border border-professor-gold/30">
                                    <p className="text-sm">{item.content}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-muted-foreground">
                                            {format(parseISO(item.created_at), "M/d HH:mm")}
                                        </span>
                                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => deleteItem(item.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-professor-sage" />
                            Action Items ({actions.length})
                        </h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowItemForm("action")}>
                            + 추가
                        </Button>
                    </div>
                    {actions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Action이 없습니다</p>
                    ) : (
                        <div className="space-y-2">
                            {actions.map((item: MeetingItem) => {
                                const owner = item.owner_id ? getProfileById(item.owner_id) : null;
                                const isOverdue = item.due_at && new Date(item.due_at) < new Date() && item.status !== "done";
                                const isDueSoon = item.due_at && !isOverdue &&
                                    new Date(item.due_at) <= new Date(Date.now() + 48 * 60 * 60 * 1000) &&
                                    item.status !== "done";

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "p-3 rounded-xl border",
                                            isOverdue
                                                ? "bg-destructive/10 border-destructive/50"
                                                : isDueSoon
                                                    ? "bg-amber-500/10 border-amber-500/50"
                                                    : "bg-professor-sage/10 border-professor-sage/30"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={item.status === "done"}
                                                onCheckedChange={(checked) =>
                                                    handleStatusChange(item.id, checked ? "done" : "open")
                                                }
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <p className={cn("text-sm", item.status === "done" && "line-through text-muted-foreground")}>
                                                    {item.content}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    {owner && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {owner.name}
                                                        </Badge>
                                                    )}
                                                    {item.due_at && (
                                                        <Badge
                                                            variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "outline"}
                                                            className={cn(
                                                                "text-xs",
                                                                isDueSoon && !isOverdue && "bg-amber-500/20 text-amber-700 border-amber-500/50"
                                                            )}
                                                        >
                                                            {isOverdue && "⚠️ "}마감: {format(parseISO(item.due_at), "M/d")}
                                                        </Badge>
                                                    )}
                                                    <Badge variant={
                                                        item.status === "done" ? "default" :
                                                            item.status === "doing" ? "secondary" : "outline"
                                                    } className="text-xs">
                                                        {item.status === "done" ? "완료" : item.status === "doing" ? "진행중" : "대기"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => deleteItem(item.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Links */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-professor-mauve" />
                            자료/링크 ({links.length})
                        </h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowItemForm("link")}>
                            + 추가
                        </Button>
                    </div>
                    {links.length === 0 ? (
                        <p className="text-sm text-muted-foreground">자료가 없습니다</p>
                    ) : (
                        <div className="space-y-2">
                            {links.map((item: MeetingItem) => {
                                const content = String(item.content || "");
                                const isFile = content.startsWith("[FILE]");
                                let displayText = content;
                                let url = "";

                                if (isFile) {
                                    const parts = content.replace("[FILE] ", "").split("|");
                                    displayText = parts[0];
                                    url = parts[1] || "";
                                } else if (content.startsWith("http")) {
                                    url = content;
                                }

                                return (
                                    <div key={item.id} className="p-3 rounded-xl bg-professor-mauve/10 border border-professor-mauve/30 flex items-center gap-3">
                                        {isFile ? <FileText className="h-4 w-4 text-professor-mauve" /> : <ExternalLink className="h-4 w-4 text-professor-mauve" />}

                                        <div className="flex-1 min-w-0">
                                            {url ? (
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate block font-medium">
                                                    {displayText}
                                                </a>
                                            ) : (
                                                <p className="text-sm truncate">{displayText}</p>
                                            )}
                                        </div>

                                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => deleteItem(item.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Add Item Form */}
                <AnimatePresence>
                    {showItemForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 rounded-xl bg-muted/30 border border-border/50"
                        >
                            <h5 className="font-medium mb-3">
                                {showItemForm === "action" ? "Action 추가" :
                                    showItemForm === "decision" ? "결정사항 추가" : "자료/링크 추가"}
                            </h5>
                            <div className="space-y-3">
                                <Input
                                    placeholder={showItemForm === "link" ? "링크 URL 또는 설명" : "내용을 입력하세요"}
                                    value={itemContent}
                                    onChange={(e) => setItemContent(e.target.value)}
                                />
                                {showItemForm === "action" && (
                                    <>
                                        <Select value={itemOwner} onValueChange={setItemOwner}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="담당자 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {profiles.map((p: Profile) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="date"
                                            value={itemDueDate}
                                            onChange={(e) => setItemDueDate(e.target.value)}
                                            placeholder="마감일"
                                        />
                                    </>
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setShowItemForm(null)}>
                                        취소
                                    </Button>
                                    <Button size="sm" onClick={handleAddItem}>
                                        추가
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ScrollArea>
    );
}
