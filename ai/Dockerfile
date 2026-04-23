FROM rust:1.93-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev cmake build-essential clang && rm -rf /var/lib/apt/lists/*

COPY . .

RUN cargo build --release

FROM debian:trixie-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/lector ./lector
COPY --from=builder /app/migrations ./migrations

ENTRYPOINT ["./lector"]