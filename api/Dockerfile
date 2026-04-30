FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o hce-api ./cmd/main.go

# Imagen final mínima
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=America/Bogota

WORKDIR /app
COPY --from=builder /app/hce-api .

EXPOSE 8000

CMD ["./hce-api"]
