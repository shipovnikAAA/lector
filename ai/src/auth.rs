use actix_web::HttpMessage;
use actix_web::{Error, dev::ServiceRequest};
use actix_web_httpauth::extractors::basic::BasicAuth;
use anyhow::{Result, anyhow};
use bcrypt::verify;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct UserIdentity {
    pub id: Uuid,
    pub username: String,
}

pub async fn validator(
    req: ServiceRequest,
    auth: BasicAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let pool = req
        .app_data::<actix_web::web::Data<PgPool>>()
        .expect("Postgres pool not found in app_data");

    match authenticate(&pool, &auth.user_id(), auth.password().unwrap_or("")).await {
        Ok(user) => {
            req.extensions_mut().insert(user);
            Ok(req)
        }
        Err(_) => {
            let error = actix_web::error::ErrorUnauthorized("Invalid credentials");
            Err((error, req))
        }
    }
}

async fn authenticate(pool: &PgPool, username: &str, password: &str) -> Result<UserIdentity> {
    let user = sqlx::query!(
        r#"
        SELECT id, username, password_hash
        FROM users
        WHERE username = $1
        "#,
        username
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| anyhow!("User not found"))?;

    if verify(password, &user.password_hash)? {
        Ok(UserIdentity {
            id: user.id,
            username: user.username,
        })
    } else {
        Err(anyhow!("Invalid password"))
    }
}
