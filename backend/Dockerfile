FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p uploads
EXPOSE 8080
# -XX:-UseBASE64Intrinsics: chặn tạm Java4Shell (CVE-2026-114938, lỗi tràn bộ nhớ ở bộ giải mã
# Base64 dùng AVX-512 của Java 17.0.6+/21). Tắt bộ giải mã "siêu tốc" bị lỗi, dùng bản thường —
# chậm không đáng kể vì app chỉ giải mã Base64 cho token đăng nhập. Không phải bản vá: vẫn phải
# lên bản Java đã vá (deploy dùng "build --pull" nên tự lấy khi Temurin phát hành).
ENTRYPOINT ["java", "-XX:-UseBASE64Intrinsics", "-jar", "app.jar"]
