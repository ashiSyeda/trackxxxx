import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchGPSLocations } from '@/store/slices/gpsSlice';
import { fetchVehicles } from '@/store/slices/vehiclesSlice';
import { Navigation, MapPin, Clock, Bus, Loader2, RefreshCw, Settings } from 'lucide-react';
import GPSMap from '@/components/GPSMap';

const GPSPage = () => {
  const dispatch = useAppDispatch();
  const { locations, isLoading } = useAppSelector((state) => state.gps);
  const { vehicles } = useAppSelector((state) => state.vehicles);

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    dispatch(fetchGPSLocations(undefined));
    dispatch(fetchVehicles());
  }, [dispatch]);

  // Simulate real-time updates by polling
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchGPSLocations(undefined));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);



  const handleRefresh = async () => {
    setIsRefreshing(true);
    await dispatch(fetchGPSLocations(undefined));
    await dispatch(fetchVehicles());
    setIsRefreshing(false);
  };

  // Merge vehicle data with latest GPS locations
  const vehiclesWithLocation = vehicles.map((vehicle: any) => {
    const latestLocation = locations.find((loc: any) => loc.vehicle_id === vehicle.vehicle_id);
    return {
      ...vehicle,
      latitude: latestLocation ? parseFloat(latestLocation.latitude) : 24.8607 + Math.random() * 2,
      longitude: latestLocation ? parseFloat(latestLocation.longitude) : 67.0011 + Math.random() * 2,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex-1">
          <h1 className="page-header text-2xl sm:text-3xl">GPS Tracking</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Real-time vehicle location tracking</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-outline text-sm px-3 py-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </button>
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="btn-ghost text-sm px-3 py-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Map Settings</span>
          </button>
        </div>
      </div>



      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Map */}
        <div className="xl:col-span-3 card-elevated overflow-hidden order-2 xl:order-1">
          <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground text-lg sm:text-xl">Live Map</h2>
              <span className="flex items-center gap-1 text-xs text-accent">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                Live
              </span>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {vehiclesWithLocation.length} vehicles online
            </div>
          </div>
          <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <GPSMap
              vehicles={vehiclesWithLocation}
              onVehicleClick={setSelectedVehicle}
            />
          </div>
        </div>

        {/* Vehicle list */}
        <div className="card-elevated overflow-hidden order-1 xl:order-2">
          <div className="p-3 sm:p-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-lg sm:text-xl">Active Vehicles</h2>
          </div>
          <div className="divide-y divide-border max-h-[300px] sm:max-h-[400px] lg:max-h-[500px] overflow-y-auto">
            {vehicles.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Bus className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No vehicles found</p>
              </div>
            ) : (
              vehiclesWithLocation.map((vehicle: any) => (
                <div
                  key={vehicle.vehicle_id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    selectedVehicle?.vehicle_id === vehicle.vehicle_id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedVehicle?.vehicle_id === vehicle.vehicle_id ? 'bg-primary' : 'bg-primary/10'
                    }`}>
                      <Bus className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        selectedVehicle?.vehicle_id === vehicle.vehicle_id ? 'text-primary-foreground' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm sm:text-base">{vehicle.vehicle_number}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {vehicle.route_name || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-accent flex-shrink-0">
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    </div>
                  </div>
                  {selectedVehicle?.vehicle_id === vehicle.vehicle_id && (
                    <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1 animate-fade-in">
                      <p>Driver: {vehicle.driver_name}</p>
                      <p className="font-mono">
                        {vehicle.latitude?.toFixed(4)}, {vehicle.longitude?.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent locations table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Location Updates</h2>
          <span className="text-sm text-muted-foreground">Last 10 updates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Vehicle</th>
                <th className="px-6 py-3 text-left">Coordinates</th>
                <th className="px-6 py-3 text-left">Timestamp</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No location data available</p>
                  </td>
                </tr>
              ) : (
                locations.slice(0, 10).map((location: any) => (
                  <tr key={location.location_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bus className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {location.vehicle_number || `Vehicle #${location.vehicle_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-sm">
                      {location.latitude}, {location.longitude}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="h-4 w-4" />
                        {new Date(location.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent mr-1.5" />
                        Active
                      </span>
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

export default GPSPage;
