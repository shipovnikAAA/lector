mod auth;
mod db;
mod handlers;
mod rag;

use crate::rag::RagSystem;
use actix_web::{App, HttpServer, middleware, web};
use sqlx::postgres::PgPoolOptions;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let admin_exists = sqlx::query("SELECT id FROM users WHERE username = 'admin'")
        .fetch_optional(&pool)
        .await
        .expect("Failed to check for admin user")
        .is_some();

    if !admin_exists {
        let hashed_password = bcrypt::hash("admin", 10).expect("Failed to hash password");
        sqlx::query(
            "INSERT INTO users (username, password_hash) VALUES ('admin', $1)"
        )
        .bind(hashed_password)
        .execute(&pool)
        .await
        .expect("Failed to seed admin user");
        println!("Default user 'admin' created with password 'admin'");
    }

    let rag = RagSystem::new()
        .await
        .expect("Failed to initialize RAG system");

    let pool_data = web::Data::new(pool);
    let rag_data = web::Data::new(rag);

    let port = env::var("PORT").unwrap_or_else(|_| "6969".to_string());
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

    println!("Starting Lector server at http://{}:{}", host, port);

    HttpServer::new(move || {
        App::new()
            .app_data(pool_data.clone())
            .app_data(rag_data.clone())
            .wrap(middleware::Logger::default())
            .configure(handlers::config_public)
            .configure(handlers::config_private)
    })
    .bind(format!("{}:{}", host, port))?
    .run()
    .await
}
