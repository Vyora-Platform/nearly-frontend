#!/bin/bash

# Nearly Microservices - Complete Startup Script
# This script builds and runs all microservices in the correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MICROSERVICES_DIR="./microservices"
DOCKER_COMPOSE_FILE="$MICROSERVICES_DIR/docker-compose.yml"

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]$NC $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]$NC $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]$NC $1"
}

print_error() {
    echo -e "${RED}[ERROR]$NC $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local max_attempts=30
    local attempt=1

    echo -e "${BLUE}[WAITING]$NC Waiting for $service_name to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service_name" | grep -q "healthy\|running"; then
            print_success "$service_name is ready!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 5
        ((attempt++))
    done

    print_error "$service_name failed to become healthy within $(($max_attempts * 5)) seconds"
    return 1
}

# Function to build Maven projects
build_services() {
    print_step "Building all microservices with Maven..."

    cd "$MICROSERVICES_DIR"

    # Check if Maven is installed
    if ! command_exists mvn; then
        print_error "Maven is not installed. Please install Maven first."
        exit 1
    fi

    # Build all services
    if mvn clean package -DskipTests -T 4; then
        print_success "All microservices built successfully!"
    else
        print_error "Failed to build microservices"
        exit 1
    fi

    cd ..
}

# Function to start infrastructure services (Docker mode)
start_infrastructure_docker() {
    print_step "Starting infrastructure services (MongoDB, Redis, Kafka, Zookeeper, Elasticsearch)..."

    cd "$MICROSERVICES_DIR"

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    # Check if Docker Compose is available
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed."
        exit 1
    fi

    # Start infrastructure services
    docker-compose up -d mongodb redis zookeeper kafka elasticsearch

    # Wait for services to be healthy
    wait_for_service mongodb
    wait_for_service redis
    wait_for_service kafka

    # Elasticsearch might take longer to start
    if wait_for_service elasticsearch; then
        print_success "Infrastructure services started successfully!"
    else
        print_warning "Elasticsearch not healthy yet, but continuing..."
    fi

    cd ..
}

# Function to check infrastructure services (Non-Docker mode)
check_infrastructure_local() {
    print_step "Checking local infrastructure services..."

    # Check MongoDB
    if timeout 5 bash -c "</dev/tcp/68.183.244.52/2027" 2>/dev/null; then
        print_success "MongoDB connection (68.183.244.52:2027)"
    else
        print_warning "MongoDB not accessible. Make sure it's running on 68.183.244.52:2027"
    fi

    # Check Redis
    if timeout 5 bash -c "</dev/tcp/localhost/6379" 2>/dev/null; then
        print_success "Redis connection (localhost:6379)"
    else
        print_warning "Redis not running locally. Please start Redis on port 6379"
    fi

    # Check Kafka
    if timeout 5 bash -c "</dev/tcp/localhost/9092" 2>/dev/null; then
        print_success "Kafka connection (localhost:9092)"
    else
        print_warning "Kafka not running locally. Please start Kafka on port 9092"
    fi

    # Check Elasticsearch
    if curl -s --max-time 5 http://68.183.244.194:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch connection (68.183.244.194:9200)"
    else
        print_warning "Elasticsearch not accessible. Make sure it's running on 68.183.244.194:9200"
    fi
}

# Function to start discovery and config services
start_core_services() {
    print_step "Starting core services (Discovery, Config, API Gateway)..."

    cd "$MICROSERVICES_DIR"

    # Start discovery service
    docker-compose up -d discovery-service
    wait_for_service discovery-service

    # Start config service
    docker-compose up -d config-service
    wait_for_service config-service

    # Start API Gateway
    docker-compose up -d api-gateway

    print_success "Core services started successfully!"
    cd ..
}

# Function to start all microservices (Docker mode)
start_all_microservices_docker() {
    print_step "Starting all microservices..."

    cd "$MICROSERVICES_DIR"

    # Start all remaining services
    docker-compose up -d \
        auth-service \
        user-service \
        activity-service \
        event-service \
        group-service \
        news-service \
        messaging-service \
        moments-service \
        marketplace-service \
        notification-service \
        search-service \
        media-service \
        random-chat-service \
        video-chat-service \
        report-service

    print_success "All microservices started!"
    cd ..
}

# Function to start all microservices (Local Maven mode)
start_all_microservices_local() {
    print_step "Starting all microservices locally with Maven..."

    # Create logs and pids directories
    mkdir -p "$MICROSERVICES_DIR/logs"
    mkdir -p "$MICROSERVICES_DIR/pids"

    # Function to start a service
    start_service_local() {
        local service=$1
        local port=$2

        print_step "Starting $service on port $port..."

        # Check if port is already in use
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "$service port $port already in use, skipping..."
            return
        fi

        cd "$MICROSERVICES_DIR/$service"

        # Start service in background with Maven
        nohup mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=$port" > "$MICROSERVICES_DIR/logs/${service}.log" 2>&1 &
        local pid=$!

        # Store PID for cleanup
        echo $pid > "$MICROSERVICES_DIR/pids/${service}.pid"

        cd "$MICROSERVICES_DIR"

        # Wait a moment for service to start
        sleep 3

        # Check if service is still running
        if kill -0 $pid 2>/dev/null; then
            print_success "$service started (PID: $pid, Port: $port)"
        else
            print_error "$service failed to start. Check logs: $MICROSERVICES_DIR/logs/${service}.log"
        fi
    }

    # Start core services first (in order)
    print_step "Starting core services..."
    start_service_local "discovery-service" 9000
    sleep 10  # Wait for Eureka to be ready

    start_service_local "config-service" 9001
    sleep 8

    start_service_local "api-gateway" 9002
    sleep 8

    # Start business services (can start in parallel-ish)
    print_step "Starting business services..."
    start_service_local "auth-service" 9003
    sleep 2
    start_service_local "user-service" 9004
    sleep 2
    start_service_local "activity-service" 9005
    sleep 2
    start_service_local "event-service" 9006
    sleep 2
    start_service_local "group-service" 9007
    sleep 2
    start_service_local "news-service" 9008
    sleep 2
    start_service_local "messaging-service" 9009
    sleep 2
    start_service_local "moments-service" 9010
    sleep 2
    start_service_local "marketplace-service" 9011
    sleep 2
    start_service_local "notification-service" 9012
    sleep 2
    start_service_local "search-service" 9013
    sleep 2
    start_service_local "media-service" 9014

    # Start chat services last
    print_step "Starting chat services..."
    sleep 2
    start_service_local "random-chat-service" 9015
    sleep 2
    start_service_local "video-chat-service" 9016
    sleep 2
    start_service_local "report-service" 9017

    print_success "All microservices started locally!"
    echo ""
    echo "📊 Service Summary:"
    echo "├── Core Services: Discovery (9000), Config (9001), Gateway (9002)"
    echo "├── Business Services: Auth (9003), User (9004), Activity (9005), etc."
    echo "└── Chat Services: Random (9015), Video (9016), Report (9017)"
    echo ""
    echo "📝 Service PIDs: $MICROSERVICES_DIR/pids/"
    echo "📄 Service logs: $MICROSERVICES_DIR/logs/"
    echo "🛑 To stop: ./run-all-services.sh local stop"
    echo "📊 To check status: ./check-services.sh"
}

# Function to show service status
show_status() {
    print_step "Checking service status..."

    cd "$MICROSERVICES_DIR"

    echo ""
    echo "=== SERVICE STATUS ==="
    docker-compose ps

    echo ""
    echo "=== HEALTH CHECKS ==="
    echo "API Gateway: http://localhost:9002/actuator/health"
    echo "Discovery: http://localhost:9000"
    echo "Config Server: http://localhost:9001"
    echo "MongoDB: 68.183.244.52:2027"
    echo "Redis: localhost:6379"
    echo "Kafka: localhost:9092"
    echo "Elasticsearch: http://68.183.244.194:9200"
    echo "Kibana: http://localhost:5601"

    echo ""
    echo "=== SERVICE ENDPOINTS ==="
    echo "Discovery Service: http://localhost:9000"
    echo "Config Server: http://localhost:9001"
    echo "API Gateway: http://localhost:9002"
    echo "Auth Service: http://localhost:9003"
    echo "User Service: http://localhost:9004"
    echo "Activity Service: http://localhost:9005"
    echo "Event Service: http://localhost:9006"
    echo "Group Service: http://localhost:9007"
    echo "News Service: http://localhost:9008"
    echo "Messaging Service: http://localhost:9009"
    echo "Moments Service: http://localhost:9010"
    echo "Marketplace Service: http://localhost:9011"
    echo "Notification Service: http://localhost:9012"
    echo "Search Service: http://localhost:9013"
    echo "Media Service: http://localhost:9014"
    echo "Random Chat: http://localhost:9015"
    echo "Video Chat: http://localhost:9016"
    echo "Report Service: http://localhost:9017"

    cd ..
}

# Function to stop all services (Docker mode)
stop_all_docker() {
    print_step "Stopping all services..."

    cd "$MICROSERVICES_DIR"

    docker-compose down

    print_success "All services stopped!"
    cd ..
}

# Function to stop all services (Local mode)
stop_all_local() {
    print_step "Stopping all local services..."

    local pids_dir="$MICROSERVICES_DIR/pids"

    if [ ! -d "$pids_dir" ]; then
        print_warning "No PID files found. No services to stop."
        return
    fi

    for pid_file in "$pids_dir"/*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            local service_name=$(basename "$pid_file" .pid)

            if kill -0 $pid 2>/dev/null; then
                print_step "Stopping $service_name (PID: $pid)..."
                kill $pid
                # Wait for graceful shutdown
                sleep 5
                if kill -0 $pid 2>/dev/null; then
                    print_warning "Force killing $service_name..."
                    kill -9 $pid
                fi
                print_success "$service_name stopped"
            else
                print_warning "$service_name (PID: $pid) was not running"
            fi

            rm "$pid_file"
        fi
    done

    # Clean up directories if empty
    if [ -z "$(ls -A "$pids_dir")" ]; then
        rm -rf "$pids_dir"
    fi

    print_success "All local services stopped!"
}

# Function to clean everything
clean_all() {
    print_step "Cleaning all containers, volumes, and images..."

    cd "$MICROSERVICES_DIR"

    docker-compose down -v --rmi all

    # Clean Maven builds
    mvn clean -q

    print_success "All cleaned!"
    cd ..
}

# Function to show usage
show_usage() {
    echo "Nearly Microservices - Startup Script"
    echo ""
    echo "Usage: $0 [MODE] [COMMAND]"
    echo ""
    echo "Modes:"
    echo "  docker    - Use Docker Compose (default)"
    echo "  local     - Run services locally with Maven"
    echo ""
    echo "Commands:"
    echo "  start     - Build and start all services (default)"
    echo "  build     - Build all microservices only"
    echo "  infra     - Start infrastructure services only"
    echo "  core      - Start core services only"
    echo "  services  - Start microservices only"
    echo "  status    - Show service status"
    echo "  stop      - Stop all services"
    echo "  clean     - Clean all containers and volumes (Docker mode only)"
    echo "  logs      - Show logs for all services"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Docker mode: build and start everything"
    echo "  $0 docker start            # Docker mode: build and start everything"
    echo "  $0 local start             # Local mode: build and start with Maven"
    echo "  $0 local stop              # Local mode: stop all services"
    echo "  $0 docker clean            # Docker mode: clean everything"
}

# Main execution
MODE="${1:-docker}"
COMMAND="${2:-start}"

# Validate mode
case "$MODE" in
    "docker"|"local")
        ;;
    *)
        # If first param is not a mode, treat it as a command with docker mode
        COMMAND="$MODE"
        MODE="docker"
        ;;
esac

case "$COMMAND" in
    "start")
        echo "🚀 Starting Nearly Microservices ($MODE mode)..."
        echo ""
        build_services

        if [ "$MODE" = "docker" ]; then
            start_infrastructure_docker
            start_core_services
            start_all_microservices_docker
        else
            check_infrastructure_local
            start_all_microservices_local
        fi

        echo ""
        show_status
        echo ""
        print_success "🎉 All services are running!"
        echo "Frontend: http://localhost:3000"
        if [ "$MODE" = "docker" ]; then
            echo "API Gateway: http://localhost:9002"
        else
            echo "API Gateway: http://localhost:9002 (local)"
            echo "Discovery: http://localhost:9000 (local)"
        fi
        ;;

    "build")
        build_services
        ;;

    "infra")
        if [ "$MODE" = "docker" ]; then
            start_infrastructure_docker
        else
            check_infrastructure_local
        fi
        ;;

    "core")
        start_core_services
        ;;

    "services")
        if [ "$MODE" = "docker" ]; then
            start_all_microservices_docker
        else
            start_all_microservices_local
        fi
        ;;

    "status")
        show_status
        ;;

    "stop")
        if [ "$MODE" = "docker" ]; then
            stop_all_docker
        else
            stop_all_local
        fi
        ;;

    "clean")
        if [ "$MODE" = "docker" ]; then
            clean_all
        else
            print_error "Clean command only available in Docker mode"
            exit 1
        fi
        ;;

    "logs")
        if [ "$MODE" = "docker" ]; then
            cd "$MICROSERVICES_DIR"
            docker-compose logs -f
            cd ..
        else
            print_step "Local service logs:"
            echo "📄 Service logs are saved in: $MICROSERVICES_DIR/logs/"
            echo "📋 To view a specific service log:"
            echo "   tail -f $MICROSERVICES_DIR/logs/<service-name>.log"
            ls -la "$MICROSERVICES_DIR/logs/" 2>/dev/null || print_warning "No log files found"
        fi
        ;;

    "help"|"-h"|"--help")
        show_usage
        ;;

    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_usage
        exit 1
        ;;
esac
