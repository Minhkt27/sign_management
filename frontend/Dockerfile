FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Nén sẵn một lần lúc build (mức nén cao nhất). nginx gửi thẳng file .gz (gzip_static) thay
# vì nén lại bundle JS ~900KB cho TỪNG lượt khách — đo tải 19/11 thấy việc nén đó ngốn CPU
# nhiều hơn cả backend (216% ở 30 khách/giây).
RUN find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' \) \
      -size +1k -exec sh -c 'gzip -9 -c "$1" > "$1.gz"' _ {} \;

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
