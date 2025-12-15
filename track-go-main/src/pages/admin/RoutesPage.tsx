import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchRoutes, createRoute, updateRoute, deleteRoute } from '@/store/slices/routesSlice';
import { MapPin, Plus, Search, Trash2, Edit, X, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const RoutesPage = () => {
  const dispatch = useAppDispatch();
  const { routes, isLoading } = useAppSelector((state) => state.routes);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [formData, setFormData] = useState({
    route_name: '',
    start_point: '',
    end_point: '',
  });

  useEffect(() => {
    dispatch(fetchRoutes());
  }, [dispatch]);

  const filteredRoutes = routes.filter((route) =>
    route.route_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingRoute(null);
    setFormData({ route_name: '', start_point: '', end_point: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (route: any) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      start_point: route.start_point,
      end_point: route.end_point,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingRoute) {
        await dispatch(
          updateRoute({ id: editingRoute.route_id, data: formData })
        ).unwrap();
        toast({ title: 'Route updated successfully' });
      } else {
        await dispatch(createRoute(formData)).unwrap();
        toast({ title: 'Route created successfully' });
      }
      setIsModalOpen(false);
      dispatch(fetchRoutes());
    } catch (error) {
      toast({ title: 'Operation failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await dispatch(deleteRoute(id)).unwrap();
        toast({ title: 'Route deleted successfully' });
      } catch (error) {
        toast({ title: 'Failed to delete route', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Routes Management</h1>
          <p className="text-muted-foreground mt-1">Manage all transportation routes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Route
          </button>
        </div>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No routes found</p>
          </div>
        ) : (
          filteredRoutes.map((route) => (
            <div key={route.route_id} className="card-elevated p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <MapPin className="h-6 w-6 text-accent" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(route)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(route.route_id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{route.route_name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-muted-foreground">From:</span>
                  <span className="text-foreground">{route.start_point}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">To:</span>
                  <span className="text-foreground">{route.end_point}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Route Name
                </label>
                <input
                  type="text"
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  placeholder="e.g., Route A"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Point
                </label>
                <input
                  type="text"
                  value={formData.start_point}
                  onChange={(e) => setFormData({ ...formData, start_point: e.target.value })}
                  placeholder="e.g., Campus Gate 1"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Point
                </label>
                <input
                  type="text"
                  value={formData.end_point}
                  onChange={(e) => setFormData({ ...formData, end_point: e.target.value })}
                  placeholder="e.g., North Block"
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  <Check className="h-4 w-4" />
                  {editingRoute ? 'Save Changes' : 'Add Route'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesPage;
