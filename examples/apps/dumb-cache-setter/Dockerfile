FROM node:22-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY --from=web /web/dist ./web/dist
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /dumb-cache-setter .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /dumb-cache-setter /dumb-cache-setter
EXPOSE 8080
ENTRYPOINT ["/dumb-cache-setter"]
