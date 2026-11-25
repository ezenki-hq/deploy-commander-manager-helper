FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /dumb-cache .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /dumb-cache /dumb-cache
EXPOSE 8080
ENTRYPOINT ["/dumb-cache"]
