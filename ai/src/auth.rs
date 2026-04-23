use actix_web::HttpMessage;
use actix_web::{Error, dev::ServiceRequest};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use anyhow::{Result, anyhow};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct UserIdentity {
    pub id: Uuid,
    pub username: String,
}

pub async fn validator(
    req: ServiceRequest,
    auth: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let pool = req
        .app_data::<actix_web::web::Data<PgPool>>()
        .expect("Postgres pool not found in app_data");

    match authenticate(&pool, auth.token()).await {
        Ok(user) => {
            req.extensions_mut().insert(user);
            Ok(req)
        }
        Err(_) => {
            let error = actix_web::error::ErrorUnauthorized("Invalid or missing token");
            Err((error, req))
        }
    }
}

async fn authenticate(pool: &PgPool, token_str: &str) -> Result<UserIdentity> {
    let token = Uuid::from_str(token_str).map_err(|_| anyhow!("Invalid token format"))?;

    let user = sqlx::query(
        r#"
        SELECT id, username
        FROM users
        WHERE token = $1
        "#
    )
    .bind(token)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("User not found or invalid token"))?;

    Ok(UserIdentity {
        id: user.try_get("id")?,
        username: user.try_get("username")?,
    })
}
