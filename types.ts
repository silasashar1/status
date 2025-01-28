export interface ServiceHealth {
  hubs: {
    [key: string]: {
      services: string[]
    }
  }
  status: {
    region: string
    csp: string
    cluster_name: string
    services: {
      service_name: string
      status: "healthy" | "unhealthy"
      version: string
      replicas: number
    }[]
  }[]
}

