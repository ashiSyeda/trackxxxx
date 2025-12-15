import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAccessLogs, addAccessLog } from '@/store/slices/accessLogsSlice';
import { fetchUsers } from '@/store/slices/usersSlice';
import { fetchCards } from '@/store/slices/cardsSlice';
import { FileText, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const AccessLogsPage = () => {
  const dispatch = useAppDispatch();
  const { logs, isLoading, error } = useAppSelector((state) => state.accessLogs);
  const { users } = useAppSelector((state) => state.users);
  const { cards } = useAppSelector((state) => state.cards);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  useEffect(() => {
    dispatch(fetchAccessLogs());
    dispatch(fetchUsers());
    dispatch(fetchCards());
  }, [dispatch]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleAddLog = async () => {
    if (!selectedUser || !selectedCard || !selectedAction) {
      return;
    }

    try {
      await dispatch(addAccessLog({
        user_id: parseInt(selectedUser),
        card_id: parseInt(selectedCard),
        action_type: selectedAction
      })).unwrap();

      // Reset form
      setSelectedUser('');
      setSelectedCard('');
      setSelectedAction('');
      setIsDialogOpen(false);

      // Refresh logs
      dispatch(fetchAccessLogs());
    } catch (error) {
      console.error('Failed to add access log:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Access Logs</h1>
          <p className="text-muted-foreground mt-1">View all access attempts and activities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Access Log</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">User</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Card</label>
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a card" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem key={card.card_id} value={card.card_id.toString()}>
                        {card.card_uid} (User ID: {card.user_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Action Type</label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access_granted">Access Granted</SelectItem>
                    <SelectItem value="access_denied">Access Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLog} disabled={!selectedUser || !selectedCard || !selectedAction}>
                  Add Log
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {/* Access Logs Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Card UID</th>
                <th className="px-6 py-3 text-left">Action Type</th>
                <th className="px-6 py-3 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading access logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      No access logs found
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">
                        {log.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {log.category_name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {log.card_uid}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.action_type === 'access_granted'
                          ? 'bg-green-100 text-green-800'
                          : log.action_type === 'access_denied'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.action_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccessLogsPage;
