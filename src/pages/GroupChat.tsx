import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { GroupChatList } from "@/components/chat/GroupChatList";
import { GroupChatRoom } from "@/components/chat/GroupChatRoom";
import { GroupChatEmptyState } from "@/components/chat/GroupChatEmptyState";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const GroupChat = () => {
  const navigate = useNavigate();
  const { groupId: paramGroupId } = useParams();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    paramGroupId
  );
  const isMobile = useIsMobile();
  const { userId, hasRole } = useUserRoleContext();
  const isAdmin = hasRole(["administrador", "sindico"]);

  const {
    groups,
    messages,
    isLoadingGroups,
    isLoadingMessages,
    sendMessage,
    deleteMessage,
    isSending,
    markAsRead,
  } = useGroupChat(selectedGroupId);

  // Sync URL with selected group
  useEffect(() => {
    if (paramGroupId && paramGroupId !== selectedGroupId) {
      setSelectedGroupId(paramGroupId);
    }
  }, [paramGroupId]);

  // Mark as read when group is selected
  useEffect(() => {
    if (selectedGroupId) {
      markAsRead(selectedGroupId);
    }
  }, [selectedGroupId, markAsRead]);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (isMobile) {
      navigate(`/dashboard/group-chat/${groupId}`);
    }
  };

  const handleBack = () => {
    setSelectedGroupId(undefined);
    navigate("/dashboard/group-chat");
  };

  const handleCreateGroup = () => {
    navigate("/dashboard/block-groups");
  };

  const handleSendMessage = (content: string, replyToId?: string) => {
    sendMessage({ content, replyToId });
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  // Mobile: Show only list or only chat
  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          {selectedGroupId && selectedGroup ? (
            <GroupChatRoom
              group={selectedGroup}
              messages={messages}
              currentUserId={userId || ""}
              isLoading={isLoadingMessages}
              isSending={isSending}
              onSendMessage={handleSendMessage}
              onDeleteMessage={deleteMessage}
              onBack={handleBack}
              showBackButton={true}
              isAdmin={isAdmin}
            />
          ) : (
            <GroupChatList
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
              onCreateGroup={handleCreateGroup}
              isLoading={isLoadingGroups}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Desktop: Side by side layout
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-5rem)] flex rounded-lg border border-border overflow-hidden bg-card">
        {/* Groups Sidebar */}
        <div className="w-80 border-r border-border shrink-0">
          <GroupChatList
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={handleCreateGroup}
            isLoading={isLoadingGroups}
            isAdmin={isAdmin}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-w-0">
          {selectedGroupId && selectedGroup ? (
            <GroupChatRoom
              group={selectedGroup}
              messages={messages}
              currentUserId={userId || ""}
              isLoading={isLoadingMessages}
              isSending={isSending}
              onSendMessage={handleSendMessage}
              onDeleteMessage={deleteMessage}
              isAdmin={isAdmin}
            />
          ) : (
            <GroupChatEmptyState
              hasGroups={groups.length > 0}
              onCreateGroup={handleCreateGroup}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GroupChat;
