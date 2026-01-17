#!/bin/bash

# Nearly Microservices - Health Check Script
# Verifies all services are running and healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MICROSERVICES_DIR="./microservices"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CHECK]$NC $1"
}

print_success() {
    echo -e "${GREEN}[OK]$NC $1"
}

print_error() {
    echo -e "${RED}[FAIL]$NC $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]$NC $1"
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local name=$2
    local timeout=${3:-5}

    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_success "$name: $url"
        return 0
    else
        print_error "$name: $url"
        return 1
    fi
}

# Function to check Docker container health
check_container() {
    local service=$1

    if docker-compose -f "$MICROSERVICES_DIR/docker-compose.yml" ps "$service" | grep -q "healthy\|running"; then
        print_success "Container: $service"
        return 0
    else
        print_error "Container: $service"
        return 1
    fi
}

# Function to check MongoDB
check_mongodb() {
    if docker-compose -f "$MICROSERVICES_DIR/docker-compose.yml" exec -T mongodb mongosh --eval "db.runCommand('ping').ok" --quiet | grep -q "1"; then
        print_success "MongoDB connection"
        return 0
    else
        print_error "MongoDB connection"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    if docker-compose -f "$MICROSERVICES_DIR/docker-compose.yml" exec -T redis redis-cli ping | grep -q "PONG"; then
        print_success "Redis connection"
        return 0
    else
        print_error "Redis connection"
        return 1
    fi
}

# Function to check Kafka
check_kafka() {
    if docker-compose -f "$MICROSERVICES_DIR/docker-compose.yml" exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
        print_success "Kafka connection"
        return 0
    else
        print_error "Kafka connection"
        return 1
    fi
}

echo "🔍 Checking Nearly Microservices Health..."
echo "========================================"

cd "$MICROSERVICES_DIR"

# Check infrastructure
echo ""
echo "🏗️  Infrastructure Services:"
echo "---------------------------"

# Check if running in Docker mode (check for containers) or local mode
if docker-compose ps -q | grep -q . 2>/dev/null; then
    echo "Mode: Docker"
    check_container mongodb
    check_container redis
    check_container kafka
    check_container elasticsearch
    check_mongodb
    check_redis
    check_kafka
else
    echo "Mode: Local"
    check_mongodb
    check_redis
    check_kafka

    # Check Elasticsearch
    if curl -s --max-time 5 http://68.183.244.194:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch connection (68.183.244.194:9200)"
    else
        print_error "Elasticsearch connection (68.183.244.194:9200)"
    fi
fi

# Check core services
echo ""
echo "🏛️  Core Services:"
echo "-----------------"
check_container discovery-service
check_container config-service
check_container api-gateway

# Check microservices
echo ""
echo "⚙️  Microservices:"
echo "-----------------"

# Define services and their ports
declare -A services=(
    [discovery-service]=9000
    [config-service]=9001
    [api-gateway]=9002
    [auth-service]=9003
    [user-service]=9004
    [activity-service]=9005
    [event-service]=9006
    [group-service]=9007
    [news-service]=9008
    [messaging-service]=9009
    [moments-service]=9010
    [marketplace-service]=9011
    [notification-service]=9012
    [search-service]=9013
    [media-service]=9014
    [random-chat-service]=9015
    [video-chat-service]=9016
    [report-service]=9017
)

if docker-compose ps -q | grep -q . 2>/dev/null; then
    # Docker mode
    for service in "${!services[@]}"; do
        check_container "$service"
    done
else
    # Local mode - check processes and ports
    for service in "${!services[@]}"; do
        port=${services[$service]}
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_success "Service: $service (Port: $port)"
        else
            print_error "Service: $service (Port: $port)"
        fi
    done
fi

# Check HTTP endpoints
echo ""
echo "🌐 HTTP Health Checks:"
echo "---------------------"
check_http "http://localhost:9002/actuator/health" "API Gateway"
check_http "http://localhost:9000" "Eureka Discovery"
check_http "http://localhost:9001/actuator/health" "Config Server"
check_http "http://localhost:9003/actuator/health" "Auth Service"
check_http "http://localhost:9004/actuator/health" "User Service"
check_http "http://localhost:9005/actuator/health" "Activity Service"
check_http "http://localhost:9006/actuator/health" "Event Service"
check_http "http://localhost:9007/actuator/health" "Group Service"
check_http "http://localhost:9008/actuator/health" "News Service"
check_http "http://localhost:9009/actuator/health" "Messaging Service"
check_http "http://localhost:9010/actuator/health" "Moments Service"
check_http "http://localhost:9011/actuator/health" "Marketplace Service"
check_http "http://localhost:9012/actuator/health" "Notification Service"
check_http "http://localhost:9013/actuator/health" "Search Service"
check_http "http://localhost:9014/actuator/health" "Media Service"
check_http "http://localhost:9015/actuator/health" "Random Chat Service"
check_http "http://localhost:9016/actuator/health" "Video Chat Service"
check_http "http://localhost:9017/actuator/health" "Report Service"

# Check external services
echo ""
echo "🔗 External Services:"
echo "--------------------"
check_http "http://localhost:9200/_cluster/health" "Elasticsearch" 10
check_http "http://localhost:5601/api/status" "Kibana" 10

cd ..

echo ""
echo "========================================"
echo "✅ Health check complete!"
echo ""
echo "📋 Quick Access:"
echo "Frontend: http://localhost:3000"
echo "API Gateway: http://localhost:9002"
echo "Eureka Dashboard: http://localhost:9000"
echo "Kibana: http://localhost:5601"
echo ""

# Check mode and provide appropriate commands
if docker-compose ps -q | grep -q . 2>/dev/null; then
    echo "📊 To view logs: ./run-all-services.sh docker logs"
    echo "🛑 To stop all: ./run-all-services.sh docker stop"
else
    echo "📊 To view logs: ./run-all-services.sh local logs"
    echo "🛑 To stop all: ./run-all-services.sh local stop"
fi
