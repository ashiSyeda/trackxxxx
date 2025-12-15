import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPermissions, addPermission, updatePermission, deletePermission } from '@/store/slices/permissionsSlice';
import { fetchCategories } from '@/store/slices/categoriesSlice';
import { Shield, Plus, Edit, Trash2 } from 'lucide-react';

const PermissionsPage = () => {
  const dispatch = useAppDispatch();
  const { permissions, isLoading, error } = useAppSelector((state) => state.permissions);
  const { categories } = useAppSelector((state) => state.categories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<any>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    allowed_area: ''
  });

  useEffect(() => {
    dispatch(fetchPermissions());
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPermission) {
        await dispatch(updatePermission({ id: editingPermission.permission_id, data: formData }));
      } else {
        await dispatch(addPermission(formData));
      }
      setIsModalOpen(false);
      setEditingPermission(null);
      setFormData({ category_id: '', allowed_area: '' });
    } catch (error) {
      console.error('Error saving permission:', error);
    }
  };

  const handleEdit = (permission: any) => {
    setEditingPermission(permission);
    setFormData({
      category_id: permission.category_id.toString(),
      allowed_area: permission.allowed_area
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this permission?')) {
      try {
        await dispatch(deletePermission(id));
      } catch (error) {
        console.error('Error deleting permission:', error);
      }
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.category_id === categoryId);
    return category?.category_name || 'Unknown';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Access Permissions</h1>
          <p className="text-muted-foreground mt-1">Manage user category permissions for different areas</p>
        </div>
        <button
          onClick={() => {
            setEditingPermission(null);
            setFormData({ category_id: '', allowed_area: '' });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Permission
        </button>
      </div>

      {/* Permissions Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Allowed Area</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading permissions...
                    </div>
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    No permissions found
                  </td>
                </tr>
              ) : (
                permissions.map((permission: any) => (
                  <tr key={permission.permission_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">
                        {getCategoryName(permission.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {permission.allowed_area}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(permission)}
                          className="text-primary hover:text-primary/80 p-2 rounded-md hover:bg-primary/10 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(permission.permission_id)}
                          className="text-destructive hover:text-destructive/80 p-2 rounded-md hover:bg-destructive/10 transition-colors"
                          title="Delete"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-xl shadow-2xl max-w-md w-full border border-border/50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {editingPermission ? 'Edit Permission' : 'Add Permission'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {editingPermission ? 'Update permission details' : 'Create a new access permission'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category: any) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Allowed Area</label>
                <input
                  type="text"
                  value={formData.allowed_area}
                  onChange={(e) => setFormData({ ...formData, allowed_area: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Main Library, Science Block"
                  required
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingPermission ? 'Update' : 'Add'} Permission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
