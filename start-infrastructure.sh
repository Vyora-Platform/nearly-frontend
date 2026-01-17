#!/bin/bash

# Start Infrastructure Services for Local Development
# This script starts Redis and Kafka locally for development

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]$NC $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]$NC $1"
}

print_error() {
    echo -e "${RED}[ERROR]$NC $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]$NC $1"
}

# Check if service is running on port
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "$service is already running on port $port"
        return 1
    else
        return 0
    fi
}

# Start Redis
start_redis() {
    print_step "Starting Redis..."

    if check_port 6379 "Redis"; then
        if command -v redis-server >/dev/null 2>&1; then
            redis-server --daemonize yes --port 6379
            sleep 2
            if pgrep -f "redis-server" >/dev/null; then
                print_success "Redis started on port 6379"
            else
                print_error "Failed to start Redis"
                return 1
            fi
        else
            print_error "Redis server not installed. Install with: brew install redis"
            return 1
        fi
    fi
    return 0
}

# Start Kafka (if installed)
start_kafka() {
    print_step "Starting Kafka..."

    if check_port 9092 "Kafka"; then
        # Check if Kafka is installed via Homebrew
        if [ -d "/opt/homebrew/opt/kafka" ]; then
            KAFKA_DIR="/opt/homebrew/opt/kafka"
        elif [ -d "/usr/local/opt/kafka" ]; then
            KAFKA_DIR="/usr/local/opt/kafka"
        else
            print_warning "Kafka not found in standard locations. Please start Kafka manually."
            print_warning "Common commands:"
            echo "  brew install kafka"
            echo "  brew services start zookeeper"
            echo "  brew services start kafka"
            return 1
        fi

        # Start Zookeeper first
        if check_port 2181 "Zookeeper"; then
            print_step "Starting Zookeeper..."
            $KAFKA_DIR/bin/zookeeper-server-start.sh -daemon $KAFKA_DIR/config/zookeeper.properties
            sleep 5
        fi

        # Start Kafka
        print_step "Starting Kafka broker..."
        $KAFKA_DIR/bin/kafka-server-start.sh -daemon $KAFKA_DIR/config/server.properties
        sleep 5

        if pgrep -f "kafka.Kafka" >/dev/null; then
            print_success "Kafka started on port 9092"
        else
            print_error "Failed to start Kafka"
            return 1
        fi
    fi
    return 0
}

# Check MongoDB (external)
check_mongodb() {
    print_step "Checking MongoDB (external)..."

    if timeout 5 bash -c "</dev/tcp/68.183.244.52/2027" 2>/dev/null; then
        print_success "MongoDB accessible at 68.183.244.52:2027"
    else
        print_warning "MongoDB not accessible. Make sure it's running on 68.183.244.52:2027"
    fi
}

# Check Elasticsearch (external)
check_elasticsearch() {
    print_step "Checking Elasticsearch (external)..."

    if curl -s --max-time 5 http://68.183.244.194:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch accessible at 68.183.244.194:9200"
    else
        print_warning "Elasticsearch not accessible. Make sure it's running on 68.183.244.194:9200"
    fi
}

# Stop services
stop_services() {
    print_step "Stopping services..."

    # Stop Kafka
    if pgrep -f "kafka.Kafka" >/dev/null; then
        pkill -f "kafka.Kafka"
        print_success "Kafka stopped"
    fi

    # Stop Zookeeper
    if pgrep -f "zookeeper" >/dev/null; then
        pkill -f "zookeeper"
        print_success "Zookeeper stopped"
    fi

    # Stop Redis
    if pgrep -f "redis-server" >/dev/null; then
        pkill -f "redis-server"
        print_success "Redis stopped"
    fi
}

# Main execution
case "${1:-start}" in
    "start")
        echo "🚀 Starting infrastructure services for local development..."
        echo ""
        start_redis
        start_kafka
        check_mongodb
        check_elasticsearch
        echo ""
        print_success "Infrastructure services check complete!"
        echo ""
        echo "📋 Services:"
        echo "Redis: localhost:6379"
        echo "Kafka: localhost:9092"
        echo "MongoDB: 68.183.244.52:2027 (external)"
        echo "Elasticsearch: 68.183.244.194:9200 (external)"
        echo ""
        echo "🛑 To stop: ./start-infrastructure.sh stop"
        ;;

    "stop")
        stop_services
        ;;

    "status")
        echo "📊 Infrastructure Status:"
        echo ""
        if pgrep -f "redis-server" >/dev/null; then
            echo "✅ Redis: Running"
        else
            echo "❌ Redis: Not running"
        fi

        if pgrep -f "kafka.Kafka" >/dev/null; then
            echo "✅ Kafka: Running"
        else
            echo "❌ Kafka: Not running"
        fi

        if timeout 5 bash -c "</dev/tcp/68.183.244.52/2027" 2>/dev/null; then
            echo "✅ MongoDB: Accessible"
        else
            echo "❌ MongoDB: Not accessible"
        fi

        if curl -s --max-time 5 http://68.183.244.194:9200/_cluster/health >/dev/null 2>&1; then
            echo "✅ Elasticsearch: Accessible"
        else
            echo "❌ Elasticsearch: Not accessible"
        fi
        ;;

    *)
        echo "Usage: $0 [start|stop|status]"
        echo ""
        echo "Commands:"
        echo "  start  - Start Redis and Kafka locally (default)"
        echo "  stop   - Stop all local services"
        echo "  status - Show status of all infrastructure services"
        exit 1
        ;;
esac
