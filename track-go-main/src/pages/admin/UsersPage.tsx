import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUsers, deleteUser, updateUser } from '@/store/slices/usersSlice';
import { fetchVehicles } from '@/store/slices/vehiclesSlice';
import {
  Users,
  Search,
  Trash2,
  Edit,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast'; 

const UsersPage = () => {
  const dispatch = useAppDispatch();
  const { users, isLoading } = useAppSelector((state) => state.users);
  const { vehicles } = useAppSelector((state) => state.vehicles);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchVehicles());
  }, [dispatch]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(id)).unwrap();
        toast({ title: 'User deleted successfully' });
      } catch (error) {
        toast({ title: 'Failed to delete user', variant: 'destructive' });
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      await dispatch(
        updateUser({
          id: editingUser.user_id,
          data: {
            name: editingUser.name,
            email: editingUser.email,
            phone: editingUser.phone,
            fee_status: editingUser.fee_status,
            vehicle_id: editingUser.vehicle_id,
          },
        })
      ).unwrap();
      toast({ title: 'User updated successfully' });
      setEditingUser(null);
      dispatch(fetchUsers());
      dispatch(fetchVehicles());
    } catch (error) {
      toast({ title: 'Failed to update user', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Users Management</h1>
          <p className="text-muted-foreground mt-1">Manage all registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Fee Status</th>
                <th className="px-6 py-3 text-left">Vehicle</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.phone}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${
                          user.fee_status === 'paid' ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {user.fee_status || 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {user.vehicle_id != null &&
                       vehicles.find((v) => Number(v.vehicle_id) === Number(user.vehicle_id))
                         ? vehicles.find((v) => Number(v.vehicle_id) === Number(user.vehicle_id)).vehicle_number
                         : "Not Assigned"}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser({ ...user })}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <input
                  type="text"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fee Status</label>
                <select
                  value={editingUser.fee_status || 'unpaid'}
                  onChange={(e) => setEditingUser({ ...editingUser, fee_status: e.target.value })}
                  className="input-field"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              {/* <div>
                <label className="block text-sm font-medium text-foreground mb-2">Assigned Vehicle</label>
                <select
                  value={editingUser.vehicle_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, vehicle_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="input-field"
                >
                  <option value="">Not Assigned</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.vehicle_number} - {vehicle.driver_name}
                    </option>
                  ))}
                </select>
              </div> */}
              <div className="flex gap-3 pt-4">
                <button onClick={() => setEditingUser(null)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button onClick={handleUpdate} className="btn-primary flex-1">
                  <Check className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
