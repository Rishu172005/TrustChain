# ╔══════════════════════════════════════════════════════════════════╗
# ║  Stage 1 — Build                                                 ║
# ║  Full Go toolchain. Output: statically linked binary.            ║
# ╚══════════════════════════════════════════════════════════════════╝
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata git

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s" \
    -o /app/bin/server \
    ./cmd/server

# ╔══════════════════════════════════════════════════════════════════╗
# ║  Stage 2 — Runtime                                               ║
# ║  Empty base. Contains only: binary, TLS roots, timezone data.    ║
# ╚══════════════════════════════════════════════════════════════════╝
FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/bin/server /server

EXPOSE 8080

USER 10001

ENTRYPOINT ["/server"]
