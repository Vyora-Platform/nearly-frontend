#!/bin/bash

# Manual Stop Script for Nearly Microservices
# Stop all services started with manual-start.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PIDS_DIR="./pids"
LOGS_DIR="./logs"

# Function to print colored output
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
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

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="$PIDS_DIR/${service_name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")

        if kill -0 $pid 2>/dev/null; then
            print_step "Stopping $service_name (PID: $pid)..."

            # Try graceful shutdown first
            kill $pid

            # Wait up to 10 seconds for graceful shutdown
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                ((count++))
            done

            if kill -0 $pid 2>/dev/null; then
                print_warning "Force killing $service_name..."
                kill -9 $pid
                sleep 1
            fi

            if kill -0 $pid 2>/dev/null; then
                print_error "Failed to kill $service_name (PID: $pid)"
                return 1
            else
                print_success "$service_name stopped"
                rm "$pid_file"
                return 0
            fi
        else
            print_warning "$service_name (PID: $pid) was not running"
            rm "$pid_file"
            return 0
        fi
    else
        print_warning "No PID file found for $service_name"
        return 0
    fi
}

# Function to stop all services
stop_all_services() {
    print_header "STOPPING ALL MICROSERVICES"

    if [ ! -d "$PIDS_DIR" ]; then
        print_warning "No PID directory found. No services to stop."
        return
    fi

    # Services in reverse startup order
    local services=(
        "report-service"
        "video-chat-service"
        "random-chat-service"
        "media-service"
        "search-service"
        "notification-service"
        "marketplace-service"
        "moments-service"
        "messaging-service"
        "news-service"
        "group-service"
        "event-service"
        "activity-service"
        "user-service"
        "auth-service"
        "api-gateway"
        "config-service"
        "discovery-service"
    )

    for service in "${services[@]}"; do
        stop_service "$service"
    done

    # Clean up empty directories
    if [ -d "$PIDS_DIR" ] && [ -z "$(ls -A "$PIDS_DIR")" ]; then
        rm -rf "$PIDS_DIR"
    fi

    print_success "All microservices stopped!"
}

# Function to show running services
show_running() {
    print_header "CHECKING RUNNING SERVICES"

    if [ ! -d "$PIDS_DIR" ]; then
        print_warning "No PID directory found."
        return
    fi

    local running_count=0

    echo "Service Status:"
    echo ""

    for pid_file in "$PIDS_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            local service_name=$(basename "$pid_file" .pid)
            local pid=$(cat "$pid_file")

            if kill -0 $pid 2>/dev/null; then
                echo -e "${GREEN}✓${NC} $service_name (PID: $pid)"
                ((running_count++))
            else
                echo -e "${RED}✗${NC} $service_name (PID: $pid - dead)"
                rm "$pid_file"
            fi
        fi
    done

    echo ""
    if [ $running_count -eq 0 ]; then
        print_warning "No services are running"
    else
        echo -e "${GREEN}$running_count service(s) running${NC}"
    fi
}

# Function to force kill all Java processes (dangerous!)
force_kill_all() {
    print_header "FORCE KILLING ALL JAVA PROCESSES"
    print_warning "This will kill ALL Java processes on the system!"
    echo ""

    read -p "Are you sure? This cannot be undone! (yes/N): " -r response
    echo ""

    if [[ "$response" == "yes" ]]; then
        print_step "Finding all Java processes..."

        local java_pids=$(pgrep -f "java.*spring-boot")

        if [ -n "$java_pids" ]; then
            echo "Found Java processes:"
            echo "$java_pids"
            echo ""

            print_step "Killing Java processes..."
            echo "$java_pids" | xargs kill -9

            sleep 2

            print_success "All Java processes killed"

            # Clean up PID files
            if [ -d "$PIDS_DIR" ]; then
                rm -rf "$PIDS_DIR"
            fi
        else
            print_warning "No Java processes found"
        fi
    else
        print_warning "Force kill cancelled"
    fi
}

# Function to clean logs and pids
clean_files() {
    print_header "CLEANING LOGS AND PID FILES"

    if [ -d "$LOGS_DIR" ]; then
        print_step "Removing log files..."
        rm -rf "$LOGS_DIR"
        print_success "Log files removed"
    else
        print_warning "No logs directory found"
    fi

    if [ -d "$PIDS_DIR" ]; then
        print_step "Removing PID files..."
        rm -rf "$PIDS_DIR"
        print_success "PID files removed"
    else
        print_warning "No PID directory found"
    fi
}

# Function to show usage
show_usage() {
    echo "Manual Stop Script for Nearly Microservices"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  stop       - Stop all services gracefully (default)"
    echo "  status     - Show running services"
    echo "  force      - Force kill all Java processes (dangerous!)"
    echo "  clean      - Remove all log and PID files"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 stop        # Stop all services"
    echo "  $0 status      # Check what's running"
    echo "  $0 clean       # Clean up files"
    echo ""
}

# Main execution
case "${1:-stop}" in
    "stop")
        stop_all_services
        ;;

    "status")
        show_running
        ;;

    "force")
        force_kill_all
        ;;

    "clean")
        clean_files
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
