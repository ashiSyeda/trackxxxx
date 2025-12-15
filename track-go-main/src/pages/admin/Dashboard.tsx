import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUsers } from '@/store/slices/usersSlice';
import { fetchRoutes } from '@/store/slices/routesSlice';
import { fetchVehicles } from '@/store/slices/vehiclesSlice';
import { fetchCards } from '@/store/slices/cardsSlice';
import { Users, MapPin, Bus, CreditCard, TrendingUp, Activity, Navigation } from 'lucide-react';

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);
  const { routes } = useAppSelector((state) => state.routes);
  const { vehicles } = useAppSelector((state) => state.vehicles);
  const { cards } = useAppSelector((state) => state.cards);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchRoutes());
    dispatch(fetchVehicles());
    dispatch(fetchCards());
  }, [dispatch]);

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'bg-primary',
      change: '+12%',
    },
    {
      label: 'Active Routes',
      value: routes.length,
      icon: MapPin,
      color: 'bg-accent',
      change: '+3%',
    },
    {
      label: 'Vehicles',
      value: vehicles.length,
      icon: Bus,
      color: 'bg-warning',
      change: '+5%',
    },
    {
      label: 'Active Cards',
      value: cards.filter((c) => c.status === 'active').length,
      icon: CreditCard,
      color: 'bg-info',
      change: '+8%',
    },
  ];

  const recentActivity = [
    { id: 1, type: 'user', action: 'New user registered', time: '2 min ago' },
    { id: 2, type: 'vehicle', action: 'BUS-101 location updated', time: '5 min ago' },
    { id: 3, type: 'card', action: 'Card #A1234 activated', time: '10 min ago' },
    { id: 4, type: 'route', action: 'Route A schedule updated', time: '15 min ago' },
    { id: 5, type: 'user', action: 'User fee status changed', time: '20 min ago' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium">{stat.change}</span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GPS Overview */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Live GPS Overview</h2>
            <Navigation className="h-5 w-5 text-accent" />
          </div>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div className="text-center z-10">
              <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">GPS Map View</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {vehicles.length} vehicles online
              </p>
            </div>
            {/* Decorative dots */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute h-3 w-3 rounded-full bg-accent animate-pulse"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 30}%`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Vehicle Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Vehicle</th>
                <th className="px-6 py-3 text-left">Driver</th>
                <th className="px-6 py-3 text-left">Route</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.slice(0, 5).map((vehicle: any) => (
                <tr key={vehicle.vehicle_id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">{vehicle.vehicle_number}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{vehicle.driver_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {vehicle.route_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No vehicles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
