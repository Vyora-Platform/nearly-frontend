# Nearly Microservices Startup Guide

## Quick Start

### Manual Mode (Recommended - Full Control)
Run each service manually using Maven Spring Boot:

```bash
# Check infrastructure first
./manual-start.sh check

# Build and start all services automatically
./manual-start.sh start

# Or see manual commands for each service
./manual-start.sh commands
```

### Docker Mode (Isolated Environment)
Run this single command to build and start everything with Docker:

```bash
./run-all-services.sh docker start
```

### Local Mode (Scripted)
Run services locally using Maven Spring Boot (requires external infrastructure):

```bash
./run-all-services.sh local start
```

## Manual Startup (Step-by-Step)

For full control over each service, use the manual scripts:

### Prerequisites Check
```bash
# Check all required infrastructure
./manual-start.sh check
```

**Required Services:**
- ✅ MongoDB: `68.183.244.52:2027` (external)
- ✅ Redis: `localhost:6379`
- ✅ Kafka: `localhost:9092`
- ✅ Elasticsearch: `68.183.244.194:9200` (external)

### Build All Services
```bash
# Build with Maven (multi-threaded)
cd microservices
mvn clean package -DskipTests -T 4
cd ..
```

### Start Services in Order

#### Phase 1: Core Infrastructure
```bash
# 1. Eureka Discovery Service
cd microservices/discovery-service
mvn spring-boot:run -Dserver.port=9000 &

# 2. Config Service
cd microservices/config-service
mvn spring-boot:run -Dserver.port=9001 &

# 3. API Gateway
cd microservices/api-gateway
mvn spring-boot:run -Dserver.port=9002 &
```

#### Phase 2: Authentication
```bash
# 4. Auth Service
cd microservices/auth-service
mvn spring-boot:run -Dserver.port=9003 &
```

#### Phase 3: Core Business Services
```bash
# 5-9. Core services
cd microservices/user-service && mvn spring-boot:run -Dserver.port=9004 &
cd microservices/activity-service && mvn spring-boot:run -Dserver.port=9005 &
cd microservices/event-service && mvn spring-boot:run -Dserver.port=9006 &
cd microservices/group-service && mvn spring-boot:run -Dserver.port=9007 &
cd microservices/news-service && mvn spring-boot:run -Dserver.port=9008 &
```

#### Phase 4: Communication Services
```bash
# 10-11. Communication
cd microservices/messaging-service && mvn spring-boot:run -Dserver.port=9009 &
cd microservices/moments-service && mvn spring-boot:run -Dserver.port=9010 &
```

#### Phase 5: Marketplace & System Services
```bash
# 12-14. Marketplace & system
cd microservices/marketplace-service && mvn spring-boot:run -Dserver.port=9011 &
cd microservices/notification-service && mvn spring-boot:run -Dserver.port=9012 &
cd microservices/search-service && mvn spring-boot:run -Dserver.port=9013 &
cd microservices/media-service && mvn spring-boot:run -Dserver.port=9014 &
```

#### Phase 6: Chat Features
```bash
# 15-17. Chat features
cd microservices/random-chat-service && mvn spring-boot:run -Dserver.port=9015 &
cd microservices/video-chat-service && mvn spring-boot:run -Dserver.port=9016 &
cd microservices/report-service && mvn spring-boot:run -Dserver.port=9017 &
```

### Automated Manual Startup
```bash
# Or use the automated manual script
./manual-start.sh start
```

### Stop All Services
```bash
# Graceful stop
./manual-stop.sh stop

# Force kill all Java processes (dangerous!)
./manual-stop.sh force

# Clean logs and PID files
./manual-stop.sh clean
```

## What the Script Does

### Docker Mode
1. **Builds** all microservices with Maven (multi-threaded)
2. **Starts** infrastructure: MongoDB, Redis, Kafka, Zookeeper, Elasticsearch
3. **Starts** core services: Eureka Discovery, Config Server, API Gateway
4. **Starts** all microservices in Docker containers
5. **Shows** service status and endpoints

### Local Mode
1. **Builds** all microservices with Maven (multi-threaded)
2. **Checks** external infrastructure services (MongoDB, Redis, Kafka, Elasticsearch)
3. **Starts** services locally using `mvn spring-boot:run`
4. **Manages** service processes with PID tracking
5. **Shows** service status and log locations

## Available Commands

### Docker Mode (Default)
```bash
./run-all-services.sh                # Build and start everything with Docker
./run-all-services.sh docker start   # Same as above
./run-all-services.sh docker build   # Build all microservices only
./run-all-services.sh docker infra   # Start infrastructure services only
./run-all-services.sh docker core    # Start core services only
./run-all-services.sh docker services # Start microservices only
./run-all-services.sh docker status  # Show service status
./run-all-services.sh docker stop    # Stop all services
./run-all-services.sh docker clean   # Clean all containers and volumes
./run-all-services.sh docker logs    # Show logs for all services
```

### Local Mode (Without Docker)
```bash
./run-all-services.sh local start    # Build and start with Maven
./run-all-services.sh local build    # Build all microservices only
./run-all-services.sh local infra    # Check infrastructure services
./run-all-services.sh local core     # Start core services only
./run-all-services.sh local services # Start microservices only
./run-all-services.sh local status   # Show service status
./run-all-services.sh local stop     # Stop all services
./run-all-services.sh local logs     # Show log file locations
```

### Manual Scripts (Full Control)
```bash
./manual-start.sh start      # Build and start all services manually
./manual-start.sh check      # Check infrastructure services
./manual-start.sh build      # Build all services only
./manual-start.sh commands   # Show manual commands for each service

./manual-stop.sh stop        # Stop all services gracefully
./manual-stop.sh status      # Show running services
./manual-stop.sh force       # Force kill all Java processes
./manual-stop.sh clean       # Remove logs and PID files

./check-services.sh          # Health check for all services
```

## Service Endpoints

### Frontend
- **Nearly App**: http://localhost:3000

### API Gateway (Entry Point)
- **Gateway**: http://localhost:9002
- **Health Check**: http://localhost:9002/actuator/health

### Infrastructure
- **Eureka Discovery**: http://localhost:9000
- **Config Server**: http://localhost:9001
- **MongoDB**: 68.183.244.52:2027
- **Redis**: localhost:6379
- **Kafka**: localhost:9092
- **Elasticsearch**: http://68.183.244.194:9200
- **Kibana**: http://localhost:5601

### Microservices

| Service | Port | Endpoint |
|---------|------|----------|
| Discovery (Eureka) | 9000 | http://localhost:9000 |
| Config Server | 9001 | http://localhost:9001 |
| API Gateway | 9002 | http://localhost:9002 |
| Auth Service | 9003 | http://localhost:9003 |
| User Service | 9004 | http://localhost:9004 |
| Activity Service | 9005 | http://localhost:9005 |
| Event Service | 9006 | http://localhost:9006 |
| Group Service | 9007 | http://localhost:9007 |
| News Service | 9008 | http://localhost:9008 |
| Messaging Service | 9009 | http://localhost:9009 |
| Moments Service | 9010 | http://localhost:9010 |
| Marketplace Service | 9011 | http://localhost:9011 |
| Notification Service | 9012 | http://localhost:9012 |
| Search Service | 9013 | http://localhost:9013 |
| Media Service | 9014 | http://localhost:9014 |
| Random Chat | 9015 | http://localhost:9015 |
| Video Chat | 9016 | http://localhost:9016 |
| Report Service | 9017 | http://localhost:9017 |

## Prerequisites

### For Docker Mode (Recommended)
Make sure you have installed:

- **Java 21** (for Maven builds)
- **Maven 3.9+** (for building services)
- **Docker** (must be running)
- **Docker Compose** (for orchestration)

### For Local Mode (Without Docker)
Make sure you have installed:

- **Java 21** (for Maven builds)
- **Maven 3.9+** (for building services)

**Required External Services:**
- **MongoDB**: Running on `68.183.244.52:2027` (with provided credentials)
- **Redis**: Running on `localhost:6379`
- **Kafka**: Running on `localhost:9092`
- **Elasticsearch**: Running on `68.183.244.194:9200`

## Troubleshooting

### Docker Not Running
```bash
# Check if Docker is running
docker info

# Start Docker (varies by OS)
# macOS: Open Docker Desktop
# Linux: sudo systemctl start docker
```

### Build Fails
```bash
# Clean and rebuild
cd microservices
mvn clean
./run-all-services.sh build
```

### Services Not Starting

#### Docker Mode
```bash
# Check logs
./run-all-services.sh docker logs

# Check service status
./run-all-services.sh docker status

# Restart specific service
cd microservices
docker-compose restart <service-name>
```

#### Manual Mode
```bash
# Check service logs
tail -f logs/<service-name>.log

# Check if service is running
./manual-stop.sh status

# Check port availability
lsof -i :9002

# Kill specific service
./manual-stop.sh stop  # Then restart manually
```

### Clean Everything and Start Fresh (Docker Mode)
```bash
./run-all-services.sh docker clean
./run-all-services.sh docker start
```

### Local Mode Issues

#### External Services Not Available
```bash
# Check infrastructure
./run-all-services.sh local infra

# Start local Redis
redis-server

# Start local Kafka (if not running externally)
# Follow Kafka installation guide for your OS
```

#### Port Conflicts
```bash
# Check what's using a port
lsof -i :9002

# Kill process using port
kill -9 <PID>

# Or use different port for specific service
cd microservices/api-gateway
mvn spring-boot:run -Dserver.port=9002
```

#### Service Startup Failures
```bash
# Check service logs
tail -f microservices/logs/<service-name>.log

# Check if config server is running
curl http://localhost:9001/actuator/health

# Check Eureka registration
curl http://localhost:9000/eureka/apps
```

## Architecture

The script starts services in this order:

1. **Infrastructure Layer**
   - MongoDB, Redis, Kafka, Elasticsearch

2. **Platform Layer**
   - Eureka (Service Discovery)
   - Config Server
   - API Gateway

3. **Business Services Layer**
   - Auth, User, Activity, Event, Group, News
   - Messaging, Moments, Marketplace
   - Notification, Search, Media

4. **Feature Services Layer**
   - Random Chat, Video Chat, Report Service

## Database Configuration

Services automatically connect to:
- **MongoDB**: `68.183.244.52:2027` (with authentication)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `http://68.183.244.194:9200`

## S3 Media Storage

Media uploads use Supabase S3-compatible storage:
- **Bucket**: vyora-bucket
- **Region**: ap-south-1
- **Endpoint**: https://abizuwqnqkbicrhorcig.storage.supabase.co/storage/v1/s3

## Monitoring

- **Eureka Dashboard**: http://localhost:9000 (service registry)
- **Kibana**: http://localhost:5601 (logs and analytics)
- **Health Checks**: All services expose `/actuator/health`

## Development Mode

### Local Development Setup

1. **Start Infrastructure Services:**
```bash
# Start Redis and Kafka locally
./start-infrastructure.sh start

# Check infrastructure status
./start-infrastructure.sh status
```

2. **Ensure External Services are Running:**
   - MongoDB: `68.183.244.52:2027`
   - Elasticsearch: `68.183.244.194:9200`

3. **Start Microservices:**
```bash
# Build all services
./run-all-services.sh local build

# Start all services locally
./run-all-services.sh local start

# Or start specific service for development
cd microservices/user-service
mvn spring-boot:run
```

### Docker Development Setup

For full Docker-based development:

```bash
# Start everything in Docker
./run-all-services.sh docker start

# Start infrastructure only
./run-all-services.sh docker infra

# Start specific service in Docker
cd microservices
docker-compose up user-service
```

### Monitoring & Debugging

```bash
# Check all services health
./check-services.sh

# View service logs
./run-all-services.sh local logs

# View specific service logs
tail -f microservices/logs/user-service.log

# Stop all services
./run-all-services.sh local stop
```
