FROM maven:3.9.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup --from=builder /build/target/eventflow-backend-0.0.1-SNAPSHOT.jar app.jar
USER appuser
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 2525
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:2525/health || exit 1
CMD ["java", "-jar", "app.jar"]
