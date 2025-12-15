import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import api from '@/services/api';
import {
  User,
  CreditCard,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  Bus,
  RefreshCw,
  Edit,
} from 'lucide-react';
import GPSMap from '@/components/GPSMap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const UserDashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [cardInfo, setCardInfo] = useState<any>(null);
  const [assignedRoute, setAssignedRoute] = useState<any>(null);
  const [vehicleLocation, setVehicleLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState(localStorage.getItem('mapbox_token') || '');
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    emergency_contact: '',
  });

  // Route editing state
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({
    route_name: '',
    start_point: '',
    end_point: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch card info
        try {
          const cardResponse = await api.get('/user/card');
          setCardInfo(cardResponse.data);
        } catch (cardError) {
          console.error('Failed to fetch card info:', cardError);
          setCardInfo({
            card_uid: 'TRX-' + (user?.user_id || '1234'),
            status: 'active',
          });
        }

        // Fetch assigned route
        try {
          const routeResponse = await api.get('/user/route');
          setAssignedRoute(routeResponse.data);
        } catch (routeError) {
          console.error('Failed to fetch route info:', routeError);
          setAssignedRoute({
            route_name: 'Route A',
            start_point: 'Campus Gate 1',
            end_point: 'North Block',
          });
        }

        // Fetch vehicle location
        try {
          const vehicleResponse = await api.get('/user/vehicle');
          setVehicleLocation(vehicleResponse.data);
        } catch (vehicleError) {
          console.error('Failed to fetch vehicle info:', vehicleError);
          setVehicleLocation({
            vehicle_id: 1,
            vehicle_number: 'BUS-101',
            driver_name: 'Aslam Driver',
            latitude: 20.5937,
            longitude: 78.9629,
            route_name: 'Route A',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSaveToken = () => {
    localStorage.setItem('mapbox_token', mapboxToken);
    setShowTokenInput(false);
  };

  const handleProfileUpdate = async () => {
    try {
      await api.put('/user/profile', profileForm);
      setIsProfileModalOpen(false);
      // Optionally refetch data
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleRouteUpdate = async () => {
    try {
      await api.put('/user/route', routeForm);
      setAssignedRoute(routeForm);
      setIsEditingRoute(false);
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  const quickStats = [
    {
      label: 'Card Status',
      value: cardInfo?.status === 'active' ? 'Active' : 'Inactive',
      icon: cardInfo?.status === 'active' ? CheckCircle : XCircle,
      color: cardInfo?.status === 'active' ? 'text-accent' : 'text-destructive',
      bgColor: cardInfo?.status === 'active' ? 'bg-accent/10' : 'bg-destructive/10',
    },
    {
      label: 'Assigned Route',
      value: assignedRoute?.route_name || 'None',
      icon: MapPin,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Last Check-in',
      value: 'Today, 8:30 AM',
      icon: Clock,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="card-elevated p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {user?.name || 'User'}!
              </h1>
              <Dialog open={isProfileModalOpen} onOpenChange={(open) => {
                setIsProfileModalOpen(open);
                if (open) {
                  setProfileForm({
                    name: user?.name || '',
                    email: user?.email || '',
                    phone: '',
                    emergency_contact: '',
                  });
                }
              }}>
                <DialogTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-muted transition-colors">
                    <Edit className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Emergency Contact"
                      value={profileForm.emergency_contact}
                      onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <DialogFooter>
                    <button
                      onClick={handleProfileUpdate}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
                    >
                      Save Profile
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground">Here's your dashboard overview</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickStats.map((stat, index) => (
              <div
                key={stat.label}
                className="p-4 rounded-lg bg-muted/50 flex items-center gap-4"
              >
                <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Info */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-info" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Your Access Card</h2>
          </div>

          {/* Card visualization */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <Navigation className="h-8 w-8" />
                <span className="text-sm font-medium opacity-80">TrackX</span>
              </div>
              <div className="mb-6">
                <p className="text-sm opacity-70">Card ID</p>
                <p className="text-xl font-mono font-bold tracking-wider">
                  {cardInfo?.card_uid || 'Loading...'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70">Holder</p>
                  <p className="font-medium">{user?.name || 'User'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-70">Status</p>
                  <p className="font-medium capitalize">{cardInfo?.status || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Info */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-accent" />
            </div>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold text-foreground">Assigned Route</h2>
              <button
                onClick={() => {
                  setIsEditingRoute(!isEditingRoute);
                  setRouteForm({
                    route_name: assignedRoute?.route_name || '',
                    start_point: assignedRoute?.start_point || '',
                    end_point: assignedRoute?.end_point || '',
                  });
                }}
                className="text-sm text-primary hover:underline"
              >
                {isEditingRoute ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>

          {isEditingRoute ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Route Name"
                value={routeForm.route_name}
                onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Start Point"
                value={routeForm.start_point}
                onChange={(e) => setRouteForm({ ...routeForm, start_point: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="End Point"
                value={routeForm.end_point}
                onChange={(e) => setRouteForm({ ...routeForm, end_point: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <button
                onClick={handleRouteUpdate}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
              >
                Save Route
              </button>
            </div>
          ) : (
            assignedRoute ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Route Name</p>
                  <p className="text-lg font-semibold text-foreground">{assignedRoute.route_name}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-accent" />
                    <div className="w-0.5 h-12 bg-border" />
                    <div className="h-3 w-3 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 space-y-8">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Point</p>
                      <p className="font-medium text-foreground">{assignedRoute.start_point}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Point</p>
                      <p className="font-medium text-foreground">{assignedRoute.end_point}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No route assigned</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium text-foreground">{user?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium text-foreground">N/A</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Emergency Contact</p>
            <p className="font-medium text-foreground">N/A</p>
          </div>
        </div>
      </div>

      {/* Live Tracking with Map */}
      <div className="card-elevated overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live Vehicle Tracking</h2>
              <p className="text-sm text-muted-foreground">Track your assigned vehicle in real-time</p>
            </div>
          </div>
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="btn-ghost text-sm"
          >
            Configure Map
          </button>
        </div>

        {showTokenInput && (
          <div className="p-4 bg-muted/50 border-b border-border">
            <div className="flex gap-3">
              <input
                type="text"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                placeholder="Enter Mapbox public token..."
                className="input-field flex-1 font-mono text-sm"
              />
              <button onClick={handleSaveToken} className="btn-primary">
                Save
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Get your free token at{' '}
              <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                mapbox.com
              </a>
            </p>
          </div>
        )}

        <div className="h-[400px]">
          {mapboxToken && vehicleLocation ? (
            <GPSMap
              vehicles={[vehicleLocation]}
              accessToken={mapboxToken}
            />
          ) : (
            <div className="h-full bg-muted relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Animated vehicle marker */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" style={{ width: '48px', height: '48px' }} />
                  <div className="relative h-12 w-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <Bus className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </div>

              <div className="relative z-10 text-center mt-32">
                <p className="text-sm text-muted-foreground mb-2">
                  Add your Mapbox token to enable live tracking
                </p>
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="btn-primary"
                >
                  Configure Map
                </button>
              </div>
            </div>
          )}
        </div>

        {vehicleLocation && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Bus className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{vehicleLocation.vehicle_number}</p>
                  <p className="text-sm text-muted-foreground">Driver: {vehicleLocation.driver_name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-accent">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm font-medium">Live</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {vehicleLocation.latitude?.toFixed(4)}, {vehicleLocation.longitude?.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;

