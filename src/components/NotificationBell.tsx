import { Bell, Package, Calendar, UserCheck, Wrench, DollarSign, Info, Check, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';

const typeIcons: Record<Notification['type'], React.ElementType> = {
  package: Package,
  reservation: Calendar,
  visitor: UserCheck,
  maintenance: Wrench,
  financial: DollarSign,
  system: Info,
};

const typeColors: Record<Notification['type'], string> = {
  package: 'text-blue-400',
  reservation: 'text-green-400',
  visitor: 'text-purple-400',
  maintenance: 'text-orange-400',
  financial: 'text-primary',
  system: 'text-muted-foreground',
};

const priorityColors: Record<Notification['priority'], string> = {
  low: 'bg-muted',
  normal: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-destructive/20 text-destructive',
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllNotifications
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const NotificationList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground text-base sm:text-lg">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Marcar lidas</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-destructive hover:text-destructive h-8 px-2"
                onClick={() => deleteAllNotifications()}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar tudo
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 h-[calc(85vh-60px)] sm:h-[400px]">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Info;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 sm:p-4 hover:bg-muted/50 cursor-pointer transition-colors group active:bg-muted/70",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-2 sm:gap-3">
                    <div className={cn(
                      "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0",
                      notification.read ? "bg-muted" : "bg-primary/10"
                    )}>
                      <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", typeColors[notification.type])} />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-start justify-between gap-1 sm:gap-2">
                        <p className={cn(
                          "font-medium text-sm leading-tight",
                          !notification.read && "text-foreground"
                        )}>
                          {notification.title}
                        </p>
                        {notification.priority !== 'normal' && notification.priority !== 'low' && (
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[10px] shrink-0 px-1.5 py-0.5", priorityColors[notification.priority])}
                          >
                            {notification.priority === 'high' ? 'Alta' : 'Urgente'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-7 sm:w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-7 sm:w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const TriggerButton = (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative hover:bg-primary/10"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse-soft">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {TriggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notificações</SheetTitle>
          </SheetHeader>
          <NotificationList />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 bg-card border-border shadow-premium z-50" 
        align="end"
        sideOffset={8}
      >
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
};