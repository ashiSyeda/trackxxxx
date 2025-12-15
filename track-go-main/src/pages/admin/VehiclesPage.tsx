import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/store/slices/vehiclesSlice';
import { fetchRoutes } from '@/store/slices/routesSlice';
import { Bus, Plus, Search, Trash2, Edit, X, Loader2, Check, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const VehiclesPage = () => {
  const dispatch = useAppDispatch();
  const { vehicles, isLoading } = useAppSelector((state) => state.vehicles);
  const { routes } = useAppSelector((state) => state.routes);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    driver_name: '',
    capacity: 40,
    route_id: '',
  });

  useEffect(() => {
    dispatch(fetchVehicles());
    dispatch(fetchRoutes());
  }, [dispatch]);

  const filteredVehicles = vehicles.filter(
    (vehicle: any) =>
      vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driver_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({ vehicle_number: '', driver_name: '', capacity: 40, route_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      driver_name: vehicle.driver_name,
      capacity: vehicle.capacity,
      route_id: vehicle.route_id?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const data = {
      ...formData,
      capacity: Number(formData.capacity),
      route_id: formData.route_id ? Number(formData.route_id) : undefined,
    };
    try {
      if (editingVehicle) {
        await dispatch(
          updateVehicle({ id: editingVehicle.vehicle_id, data })
        ).unwrap();
        toast({ title: 'Vehicle updated successfully' });
      } else {
        await dispatch(createVehicle(data)).unwrap();
        toast({ title: 'Vehicle created successfully' });
      }
      setIsModalOpen(false);
      dispatch(fetchVehicles());
    } catch (error) {
      toast({ title: 'Operation failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await dispatch(deleteVehicle(id)).unwrap();
        toast({ title: 'Vehicle deleted successfully' });
      } catch (error) {
        toast({ title: 'Failed to delete vehicle', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Vehicles Management</h1>
          <p className="text-muted-foreground mt-1">Manage your vehicle fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Vehicle</th>
                <th className="px-6 py-3 text-left">Driver</th>
                <th className="px-6 py-3 text-left">Capacity</th>
                <th className="px-6 py-3 text-left">Route</th>
                <th className="px-6 py-3 text-left">Status</th>
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
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No vehicles found</p>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle: any) => (
                  <tr key={vehicle.vehicle_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Bus className="h-5 w-5 text-warning" />
                        </div>
                        <span className="font-medium text-foreground">{vehicle.vehicle_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{vehicle.driver_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{vehicle.capacity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={vehicle.route_name ? 'text-foreground' : 'text-muted-foreground'}>
                        {vehicle.route_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(vehicle)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.vehicle_id)}
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
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
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="e.g., BUS-101"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder="Enter driver name"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  placeholder="40"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Assign Route
                </label>
                <select
                  value={formData.route_id}
                  onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select a route</option>
                  {routes.map((route) => (
                    <option key={route.route_id} value={route.route_id}>
                      {route.route_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  <Check className="h-4 w-4" />
                  {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
