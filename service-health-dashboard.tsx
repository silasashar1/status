"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import type { ServiceHealth } from "./types"
import Image from "next/image"

type ProviderType = "AWS" | "DCC" | "Azure"

// Define a type for the service
type Service = {
  service_name: string;
  status: string;
  version: string;
  replicas: number;
};

// Define a type for the hub
type Hub = {
  services: Service[];
};

// Define a type for the data
type HealthData = {
  hubs: Record<string, Hub>;
  status: any[]; // Adjust this type based on your actual data structure
};

// Update the ServiceHealth type to match HealthData
type ServiceHealth = {
  hubs: Record<string, Hub>;
  status: any[]; // Adjust this type based on your actual data structure
};

export default function ServiceHealthDashboard() {
  const [healthData, setHealthData] = useState<ServiceHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("AWS")
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  const [tableLoading, setTableLoading] = useState(false)
  const [serviceRefreshStates, setServiceRefreshStates] = useState<Record<string, { loading: boolean, lastRefresh: Date }>>({})

  useEffect(() => {
    fetchHealthData()
  }, [])

  const fetchHealthData = async () => {
    try {
      const response = await fetch("https://health.vue.ai/services-health")
      const data: HealthData = await response.json()
      setHealthData(data)
      setLoading(false)
      setLastRefreshTime(new Date())
      
      // Reset all service refresh states with the new refresh time
      const newServiceStates: Record<string, { loading: boolean; lastRefresh: Date }> = {}
      Object.values(data.hubs).forEach((hub: Hub) => {
        hub.services.forEach((service: Service) => {
          newServiceStates[service.service_name] = { loading: false, lastRefresh: new Date() }
        })
      })
      setServiceRefreshStates(newServiceStates)
    } catch (err) {
      setError("Failed to fetch service health data")
      setLoading(false)
    }
  }

  const refreshTableData = async () => {
    setTableLoading(true)
    try {
      const response = await fetch("https://health.vue.ai/services-health")
      const data = await response.json()
      setHealthData(data)
    } catch (err) {
      setError("Failed to fetch service health data")
    } finally {
      setTableLoading(false)
    }
  }

  const refreshServiceData = async (serviceName: string) => {
    setServiceRefreshStates(prev => ({
      ...prev,
      [serviceName]: { loading: true, lastRefresh: prev[serviceName]?.lastRefresh || new Date() }
    }));
    
    try {
      const response = await fetch("https://health.vue.ai/services-health");
      const data = await response.json();
      setHealthData(data);
      setServiceRefreshStates(prev => ({
        ...prev,
        [serviceName]: { loading: false, lastRefresh: new Date() }
      }));
    } catch (err) {
      setError("Failed to fetch service health data");
      setServiceRefreshStates(prev => ({
        ...prev,
        [serviceName]: { loading: false, lastRefresh: prev[serviceName]?.lastRefresh || new Date() }
      }));
    }
  };

  const getTimeSinceLastRefresh = () => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - lastRefreshTime.getTime()) / 60000)
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes === 1) return '1 min ago'
    return `${diffInMinutes} mins ago`
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading service health status...</div>
      </div>
    )
  }

  if (error || !healthData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-500">{error || "Failed to load health data"}</div>
      </div>
    )
  }

  const allServices = new Set<string>()
  Object.values(healthData.hubs).forEach((hub) => {
    hub.services.forEach((service) => allServices.add(service))
  })

  const filteredRegions = healthData.status.filter((region) => {
    if (selectedProvider === "AWS")
      return region.csp.toLowerCase() === "aws" && region.cluster_name !== "DCC-Production"
    if (selectedProvider === "DCC") return region.cluster_name === "DCC-Production"
    if (selectedProvider === "Azure") return region.csp.toLowerCase() === "azure"
    return false
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const isAllHealthy = filteredRegions.every((region) =>
    region.services.every((service) => service.status === "healthy"),
  )

  const toggleServiceExpansion = (serviceName: string) => {
    setExpandedServices((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(serviceName)) {
        newSet.delete(serviceName)
      } else {
        newSet.add(serviceName)
      }
      return newSet
    })
  }

  // Utility function to format service names
  const formatServiceName = (name: string) => {
    if (name === "workflow") return "Workflow Manager";
    return name.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <Image
          src="/new-D.png"
          alt="Vue.ai Logo"
          width={120}
          height={32}
          className="h-8 w-auto"
          priority
        />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 py-16">
            <div className={`rounded-full p-3 ${isAllHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
              {isAllHealthy ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isAllHealthy ? 'All components are Operational' : 'Service Disruption Detected'}
            </h1>
            <div className="text-sm text-gray-500">
              Last refreshed {getTimeSinceLastRefresh()}{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setLoading(true);
                  fetchHealthData();
                }}
                className="text-blue-500 hover:text-blue-700 underline flex items-center space-x-1 inline-flex"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh All Providers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cloud Provider Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {["AWS", "DCC", "Azure"].map((provider) => (
              <button
                key={provider}
                onClick={() => setSelectedProvider(provider as ProviderType)}
                className={`${
                  selectedProvider === provider
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
              >
                {provider}
              </button>
            ))}
          </nav>
        </div>

        {/* Service Status Table */}
        <div className="mb-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Service Health Status</h2>
            <button
              onClick={refreshTableData}
              className="flex items-center space-x-1 text-sm text-blue-500 hover:text-blue-700"
              disabled={tableLoading}
            >
              {tableLoading ? (
                <span>Refreshing...</span>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Table</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            {tableLoading ? (
              <div className="flex justify-center items-center h-32">
                <span className="text-gray-500">Refreshing table data...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500">Service</th>
                    {filteredRegions.map((region) => (
                      <th key={region.region} className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                        {region.region}
                        <div className="text-[10px] text-gray-400">{region.cluster_name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from(allServices).map((serviceName) => (
                    <>
                      <tr
                        key={serviceName}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleServiceExpansion(serviceName)}
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 flex items-center">
                          {expandedServices.has(serviceName) ? (
                            <ChevronUp className="h-4 w-4 mr-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          )}
                          {formatServiceName(serviceName)}
                        </td>
                        {filteredRegions.map((region) => {
                          const service = region.services.find((s) => s.service_name === serviceName)
                          return (
                            <td key={`${region.region}-${serviceName}`} className="whitespace-nowrap px-3 py-4 text-sm">
                              {service ? (
                                getStatusIcon(service.status)
                              ) : (
                                <span className="text-xs text-gray-400">N/A</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                      {expandedServices.has(serviceName) && (
                        <tr className="bg-gray-50">
                          <td colSpan={filteredRegions.length + 1} className="px-4 py-2">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {filteredRegions.map((region) => {
                                const service = region.services.find((s) => s.service_name === serviceName)
                                return (
                                  <div key={`${region.region}-${serviceName}-details`} className="text-xs">
                                    <h4 className="font-semibold mb-1">{region.region}</h4>
                                    {service ? (
                                      <div className="flex items-center space-x-4">
                                        <span>v{service.version}</span>
                                        <span>Replicas: {service.replicas}</span>
                                        <div className="flex items-center space-x-2">
                                          {serviceRefreshStates[serviceName]?.lastRefresh && (
                                            <span className="text-gray-500">
                                              Updated {new Date(serviceRefreshStates[serviceName].lastRefresh).toLocaleTimeString()}
                                            </span>
                                          )}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              refreshServiceData(serviceName);
                                            }}
                                            className="flex items-center space-x-1 p-1 hover:bg-gray-200 rounded"
                                            disabled={serviceRefreshStates[serviceName]?.loading}
                                          >
                                            <RefreshCw className={`h-3 w-3 ${serviceRefreshStates[serviceName]?.loading ? 'animate-spin' : ''}`} />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p>Service not available</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

