# Manual Startup Guide for Nearly Microservices

This guide shows how to start all 17 microservices manually using `mvn spring-boot:run`.

## Quick Start

```bash
# 1. Check infrastructure
./manual-start.sh check

# 2. Start all services
./manual-start.sh start

# 3. Check status
./check-services.sh
```

## Prerequisites

### Required External Services
- **MongoDB**: `68.183.244.52:2027` (with authentication)
- **Redis**: `localhost:6379`
- **Kafka**: `localhost:9092`
- **Elasticsearch**: `68.183.244.194:9200`

### Start Local Infrastructure
```bash
# Start Redis and Kafka locally
./start-infrastructure.sh start

# Check status
./start-infrastructure.sh status
```

## Manual Commands

### Build All Services
```bash
cd microservices
mvn clean package -DskipTests -T 4
cd ..
```

### Start Services in Order

Open multiple terminals and run each command:

```bash
# Terminal 1: Core Infrastructure
cd microservices/discovery-service && mvn spring-boot:run -Dserver.port=9000

# Terminal 2: Config Service
cd microservices/config-service && mvn spring-boot:run -Dserver.port=9001

# Terminal 3: API Gateway
cd microservices/api-gateway && mvn spring-boot:run -Dserver.port=9002

# Terminal 4: Auth Service
cd microservices/auth-service && mvn spring-boot:run -Dserver.port=9003

# Terminal 5: User Service
cd microservices/user-service && mvn spring-boot:run -Dserver.port=9004

# Terminal 6: Activity Service
cd microservices/activity-service && mvn spring-boot:run -Dserver.port=9005

# Terminal 7: Event Service
cd microservices/event-service && mvn spring-boot:run -Dserver.port=9006

# Terminal 8: Group Service
cd microservices/group-service && mvn spring-boot:run -Dserver.port=9007

# Terminal 9: News Service
cd microservices/news-service && mvn spring-boot:run -Dserver.port=9008

# Terminal 10: Messaging Service
cd microservices/messaging-service && mvn spring-boot:run -Dserver.port=9009

# Terminal 11: Moments Service
cd microservices/moments-service && mvn spring-boot:run -Dserver.port=9010

# Terminal 12: Marketplace Service
cd microservices/marketplace-service && mvn spring-boot:run -Dserver.port=9011

# Terminal 13: Notification Service
cd microservices/notification-service && mvn spring-boot:run -Dserver.port=9012

# Terminal 14: Search Service
cd microservices/search-service && mvn spring-boot:run -Dserver.port=9013

# Terminal 15: Media Service
cd microservices/media-service && mvn spring-boot:run -Dserver.port=9014

# Terminal 16: Random Chat
cd microservices/random-chat-service && mvn spring-boot:run -Dserver.port=9015

# Terminal 17: Video Chat
cd microservices/video-chat-service && mvn spring-boot:run -Dserver.port=9016

# Terminal 18: Report Service
cd microservices/report-service && mvn spring-boot:run -Dserver.port=9017
```

## Background Mode (Recommended)

To run services in background, add `&` at the end:

```bash
cd microservices/discovery-service && mvn spring-boot:run -Dserver.port=9000 &
cd microservices/config-service && mvn spring-boot:run -Dserver.port=9001 &
# ... etc
```

## Service Dependencies Order

1. **discovery-service** → Eureka registry
2. **config-service** → Centralized configuration
3. **api-gateway** → Entry point (depends on discovery)
4. **auth-service** → User authentication
5. **user-service** → User management
6. **activity-service** → Activities
7. **event-service** → Events
8. **group-service** → Groups
9. **news-service** → News
10. **messaging-service** → Chat
11. **moments-service** → Stories
12. **marketplace-service** → Jobs/Deals/Places/Pages
13. **notification-service** → Notifications
14. **search-service** → Search
15. **media-service** → File uploads
16. **random-chat-service** → Anonymous text chat
17. **video-chat-service** → Video chat
18. **report-service** → User reports

## Check Service Health

```bash
# Check specific service
curl http://localhost:9002/actuator/health

# Check Eureka dashboard
open http://localhost:9000

# Check all services
./check-services.sh
```

## Stop Services

```bash
# Graceful stop
./manual-stop.sh stop

# Check what's running
./manual-stop.sh status

# Force kill all Java processes (dangerous!)
./manual-stop.sh force
```

## Logs

Each service logs to:
```
logs/<service-name>.log
```

View logs:
```bash
tail -f logs/api-gateway.log
tail -f logs/user-service.log
# etc
```

## Troubleshooting

### Service Won't Start
1. Check if port is available: `lsof -i :9002`
2. Check logs: `tail -f logs/<service>.log`
3. Check dependencies are running
4. Check configuration server: `curl http://localhost:9001`

### Infrastructure Issues
```bash
# Check MongoDB
timeout 5 bash -c "</dev/tcp/68.183.244.52/2027"

# Check Redis
redis-cli ping

# Check Kafka
nc -z localhost 9092

# Check Elasticsearch
curl http://68.183.244.194:9200/_cluster/health
```

### Memory Issues
If services crash with out-of-memory errors:
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx2g -Xms1g"
mvn spring-boot:run -Dserver.port=9002
```

## Development Tips

### Run Single Service for Development
```bash
# Run only the service you're working on
cd microservices/user-service
mvn spring-boot:run -Dserver.port=9004

# With debug enabled
mvn spring-boot:run -Dserver.port=9004 -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### Hot Reload
For faster development with hot reload:
```bash
mvn spring-boot:run -Dspring.devtools.restart.enabled=true
```

### IDE Integration
Most IDEs can run Spring Boot applications directly:
- IntelliJ IDEA: Right-click → Run
- VS Code: Use Java Extension Pack
- Eclipse: Run As → Spring Boot App

## Service URLs

| Service | Port | URL | Health Check |
|---------|------|-----|--------------|
| Discovery (Eureka) | 9000 | http://localhost:9000 | N/A |
| Config Server | 9001 | http://localhost:9001 | /actuator/health |
| API Gateway | 9002 | http://localhost:9002 | /actuator/health |
| Auth | 9003 | http://localhost:9003 | /actuator/health |
| User | 9004 | http://localhost:9004 | /actuator/health |
| Activity | 9005 | http://localhost:9005 | /actuator/health |
| Event | 9006 | http://localhost:9006 | /actuator/health |
| Group | 9007 | http://localhost:9007 | /actuator/health |
| News | 9008 | http://localhost:9008 | /actuator/health |
| Messaging | 9009 | http://localhost:9009 | /actuator/health |
| Moments | 9010 | http://localhost:9010 | /actuator/health |
| Marketplace | 9011 | http://localhost:9011 | /actuator/health |
| Notification | 9012 | http://localhost:9012 | /actuator/health |
| Search | 9013 | http://localhost:9013 | /actuator/health |
| Media | 9014 | http://localhost:9014 | /actuator/health |
| Random Chat | 9015 | http://localhost:9015 | /actuator/health |
| Video Chat | 9016 | http://localhost:9016 | /actuator/health |
| Report | 9017 | http://localhost:9017 | /actuator/health |

## Frontend

Start the React frontend:
```bash
cd client
npm install
npm run dev
```

Frontend will be available at: http://localhost:3000
