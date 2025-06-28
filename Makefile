all: update up

update: 
	@go get -u ./...
	@go mod tidy

run:
	@go run main.go


docker-build:
	@docker build -t video-processor-front:0.0.1 .

podman-build:
	@podman build -t video-processor-front:0.0.1 .
