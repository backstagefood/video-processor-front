FROM golang:1.24.4-alpine AS base

WORKDIR /app

COPY . .

RUN go mod tidy

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o video-processor-front .

FROM alpine

# Criar diretório de trabalho
WORKDIR /app

COPY --from=base /app/video-processor-front .
COPY ./static/index.html /app/static/index.html

CMD ["/app/video-processor-front"]