#!/bin/bash

# Manual Startup Script for Nearly Microservices
# Run each service manually using mvn spring-boot:run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MICROSERVICES_DIR="$SCRIPT_DIR/microservices"
INFRASTRUCTURE_SCRIPT="$SCRIPT_DIR/start-infrastructure.sh"

# Function to print colored output
print_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================================${NC}"
}

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

print_service() {
    echo -e "${PURPLE}[SERVICE]$NC $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use (possibly $service)"
        return 1
    else
        print_success "Port $port is available for $service"
        return 0
    fi
}

# Function to start a service
start_service() {
    local service_name=$1
    local port=$2
    local description=$3

    print_service "Starting $service_name ($description) on port $port..."

    # Check if port is available
    if ! check_port $port "$service_name"; then
        echo -e "${YELLOW}Skip starting $service_name? (y/N): ${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_warning "Skipping $service_name"
            return 1
        fi
    fi

    # Change to service directory
    cd "$MICROSERVICES_DIR/$service_name"

    # Start service in background
    print_step "Running: mvn spring-boot:run -Dserver.port=$port"
    nohup mvn spring-boot:run -Dserver.port=$port > "../../logs/${service_name}.log" 2>&1 &

    local pid=$!
    echo $pid > "../../pids/${service_name}.pid"

    # Wait a moment for service to start
    sleep 5

    # Check if service is still running
    if kill -0 $pid 2>/dev/null; then
        print_success "$service_name started (PID: $pid, Port: $port)"
        echo -e "${BLUE}Logs: tail -f logs/${service_name}.log${NC}"
        echo -e "${BLUE}Health: http://localhost:$port/actuator/health${NC}"
        echo ""
    else
        print_error "$service_name failed to start. Check logs: logs/${service_name}.log"
        return 1
    fi

    cd "$MICROSERVICES_DIR"
    return 0
}

# Function to wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    print_step "Waiting for $service_name to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/actuator/health" | grep -q '"status":"UP"'; then
            print_success "$service_name is healthy!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 3
        ((attempt++))
    done

    print_warning "$service_name health check timeout, but continuing..."
    return 0
}

# Function to check infrastructure
check_infrastructure() {
    print_header "CHECKING INFRASTRUCTURE"

    ensure_project_root

    echo "Required external services:"
    echo ""

    # Check MongoDB
    if timeout 5 bash -c "</dev/tcp/68.183.244.52/2027" 2>/dev/null; then
        print_success "MongoDB: 68.183.244.52:2027 ✓"
    else
        print_error "MongoDB: 68.183.244.52:2027 ✗"
        print_warning "Make sure MongoDB is running with authentication"
    fi

    # Check Redis
    if timeout 5 bash -c "</dev/tcp/localhost/6379" 2>/dev/null; then
        print_success "Redis: localhost:6379 ✓"
    else
        print_error "Redis: localhost:6379 ✗"
        echo -e "${YELLOW}Start Redis: $INFRASTRUCTURE_SCRIPT start${NC}"
    fi

    # Check Kafka
    if timeout 5 bash -c "</dev/tcp/localhost/9092" 2>/dev/null; then
        print_success "Kafka: localhost:9092 ✓"
    else
        print_error "Kafka: localhost:9092 ✗"
        echo -e "${YELLOW}Start Kafka: $INFRASTRUCTURE_SCRIPT start${NC}"
    fi

    # Check Elasticsearch
    if curl -s --max-time 5 http://68.183.244.194:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch: 68.183.244.194:9200 ✓"
    else
        print_error "Elasticsearch: 68.183.244.194:9200 ✗"
    fi

    echo ""
    echo -e "${BLUE}Use $INFRASTRUCTURE_SCRIPT to start local Redis/Kafka${NC}"
    echo ""
}

# Function to build all services
build_services() {
    print_header "BUILDING ALL MICROSERVICES"

    ensure_project_root

    cd "$MICROSERVICES_DIR"

    print_step "Building with Maven (this may take several minutes)..."

    if mvn clean package -DskipTests -T 4 -q; then
        print_success "All microservices built successfully!"
    else
        print_error "Build failed!"
        exit 1
    fi

    cd "$SCRIPT_DIR"
}

# Function to ensure we're in the right directory
ensure_project_root() {
    if [ ! -d "$MICROSERVICES_DIR" ]; then
        print_error "Microservices directory not found: $MICROSERVICES_DIR"
        print_error "Please run this script from the Nearly project root directory."
        exit 1
    fi

    # Change to script directory to ensure relative paths work
    cd "$SCRIPT_DIR"

    if [ ! -d "microservices" ]; then
        print_error "microservices directory not found in script directory: $SCRIPT_DIR"
        exit 1
    fi
}

# Main startup function
start_all_services() {
    print_header "STARTING NEARLY MICROSERVICES MANUALLY"

    echo "This will start all 17 microservices in the correct order."
    echo "Make sure infrastructure services are running before proceeding."
    echo ""

    # Ensure we're in the right directory
    ensure_project_root

    # Create directories
    mkdir -p logs pids

    # Phase 1: Core Infrastructure Services
    print_header "PHASE 1: CORE INFRASTRUCTURE SERVICES"

    start_service "discovery-service" 9000 "Eureka Service Discovery"
    wait_for_service "discovery-service" 9000

    start_service "config-service" 9001 "Spring Cloud Config Server"
    wait_for_service "config-service" 9001

    # Phase 2: API Gateway
    print_header "PHASE 2: API GATEWAY"

    start_service "api-gateway" 9002 "Spring Cloud Gateway"
    wait_for_service "api-gateway" 9002

    # Phase 3: Authentication
    print_header "PHASE 3: AUTHENTICATION SERVICE"

    start_service "auth-service" 9003 "User Authentication & Sessions"

    # Phase 4: Core Business Services
    print_header "PHASE 4: CORE BUSINESS SERVICES"

    start_service "user-service" 9004 "User Profiles & Follows"
    start_service "activity-service" 9005 "Activities Management"
    start_service "event-service" 9006 "Events & Guests"
    start_service "group-service" 9007 "Groups & Members"
    start_service "news-service" 9008 "Community News"

    # Phase 5: Communication Services
    print_header "PHASE 5: COMMUNICATION SERVICES"

    start_service "messaging-service" 9009 "Direct & Group Chat"
    start_service "moments-service" 9010 "Stories & Streaks"

    # Phase 6: Marketplace Services
    print_header "PHASE 6: MARKETPLACE SERVICES"

    start_service "marketplace-service" 9011 "Jobs, Deals, Places, Pages"

    # Phase 7: System Services
    print_header "PHASE 7: SYSTEM SERVICES"

    start_service "notification-service" 9012 "Real-time Notifications"
    start_service "search-service" 9013 "Elasticsearch Search"
    start_service "media-service" 9014 "S3 Media Upload"

    # Phase 8: Chat Features
    print_header "PHASE 8: CHAT FEATURES"

    start_service "random-chat-service" 9015 "Anonymous Text Chat"
    start_service "video-chat-service" 9016 "WebRTC Video Chat"
    start_service "report-service" 9017 "User Reports"

    print_header "STARTUP COMPLETE!"
    echo ""
    echo -e "${GREEN}🎉 All microservices started!${NC}"
    echo ""
    echo -e "${BLUE}📊 Service Summary:${NC}"
    echo "├── API Gateway: http://localhost:9002"
    echo "├── Eureka Dashboard: http://localhost:9000"
    echo "├── Config Server: http://localhost:9001"
    echo "├── Frontend: http://localhost:3000"
    echo "├── Kibana: http://localhost:5601"
    echo ""
    echo -e "${BLUE}📄 Service Logs:${NC} ./logs/"
    echo -e "${BLUE}🛑 To stop all:${NC} ./manual-stop.sh"
    echo -e "${BLUE}🔍 Check status:${NC} ./check-services.sh"
    echo ""
}

# Function to show manual commands
show_manual_commands() {
    print_header "MANUAL STARTUP COMMANDS"

    echo "If you prefer to run each command manually, here they are:"
    echo ""
    echo "# 1. Build all services:"
    echo "cd microservices && mvn clean package -DskipTests -T 4"
    echo ""
    echo "# 2. Start services in order:"
    echo ""

    declare -A services=(
        ["discovery-service"]="9000:Eureka Service Discovery"
        ["config-service"]="9001:Spring Cloud Config Server"
        ["api-gateway"]="9002:Spring Cloud Gateway"
        ["auth-service"]="9003:User Authentication & Sessions"
        ["user-service"]="9004:User Profiles & Follows"
        ["activity-service"]="9005:Activities Management"
        ["event-service"]="9006:Events & Guests"
        ["group-service"]="9007:Groups & Members"
        ["news-service"]="9008:Community News"
        ["messaging-service"]="9009:Direct & Group Chat"
        ["moments-service"]="9010:Stories & Streaks"
        ["marketplace-service"]="9011:Jobs, Deals, Places, Pages"
        ["notification-service"]="9012:Real-time Notifications"
        ["search-service"]="9013:Elasticsearch Search"
        ["media-service"]="9014:S3 Media Upload"
        ["random-chat-service"]="9015:Anonymous Text Chat"
        ["video-chat-service"]="9016:WebRTC Video Chat"
        ["report-service"]="9017:User Reports"
    )

    for service in "${!services[@]}"; do
        IFS=':' read -r port description <<< "${services[$service]}"
        echo "cd microservices/$service"
        echo "mvn spring-boot:run -Dserver.port=$port &"
        echo "# $description"
        echo ""
    done

    echo "# Check health:"
    echo "curl http://localhost:9002/actuator/health"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Manual Startup Script for Nearly Microservices"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start      - Build and start all services automatically"
    echo "  check      - Check infrastructure services only"
    echo "  build      - Build all services only"
    echo "  commands   - Show manual commands for each service"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start        # Build and start everything"
    echo "  $0 check        # Check infrastructure"
    echo "  $0 commands     # Show manual commands"
    echo ""
}

# Main execution
case "${1:-start}" in
    "start")
        check_infrastructure
        echo ""
        read -p "Continue with startup? (y/N): " -r response
        echo ""
        if [[ "$response" =~ ^[Yy]$ ]]; then
            build_services
            start_all_services
        else
            echo "Startup cancelled."
        fi
        ;;

    "check")
        check_infrastructure
        ;;

    "build")
        build_services
        ;;

    "commands")
        show_manual_commands
        ;;

    "help"|"-h"|"--help")
        show_usage
        ;;

    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
