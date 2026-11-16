# The API image.
#
# Two stages so the finished image carries a runtime and a jar rather than a whole build toolchain:
# Maven and the dependency cache stay behind in the builder.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src

# The pom alone first, so a code change does not re-download the internet. This layer is only
# invalidated when a dependency actually changes.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

# ffmpeg measures loudness and encodes the stream and preview for every upload. Without it the app
# still starts and the seeded songs still play, but an artist's upload fails at the processing step.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /src/target/*.jar app.jar

# Uploads land here. On a host with an ephemeral filesystem this does not survive a restart, which is
# why the seeded recordings travel inside the jar and are written back on startup (see SeedMedia).
ENV DEEGEE_MEDIA_DIR=/app/media
RUN mkdir -p /app/media

# Free tiers are small. Without this the JVM sizes its heap against the machine's memory rather than
# the container's limit and gets killed under load.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"

EXPOSE 8080
# The host passes a port in; the app reads ${PORT:8080}.
CMD ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
