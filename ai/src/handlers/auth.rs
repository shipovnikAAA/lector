use actix_web::{web, HttpResponse, Responder};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: Uuid,
}

pub async fn register(
    pool: web::Data<PgPool>,
    req: web::Json<AuthRequest>,
) -> actix_web::Result<impl Responder> {
    let hashed_password = hash(req.password.as_str(), DEFAULT_COST)
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let token = Uuid::new_v4();

    let result = sqlx::query!(
        r#"
        INSERT INTO users (username, password_hash, token)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
        req.username,
        hashed_password,
        token
    )
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(AuthResponse { token })),
        Err(e) => {
            if let Some(db_err) = e.as_database_error() {
                if db_err.is_unique_violation() {
                    return Err(actix_web::error::ErrorConflict("User already exists"));
                }
            }
            Err(actix_web::error::ErrorInternalServerError(e))
        }
    }
}

pub async fn login(
    pool: web::Data<PgPool>,
    req: web::Json<AuthRequest>,
) -> actix_web::Result<impl Responder> {
    let user = sqlx::query!(
        r#"
        SELECT password_hash, token
        FROM users
        WHERE username = $1
        "#,
        req.username
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    .ok_or_else(|| actix_web::error::ErrorUnauthorized("Invalid credentials"))?;

    if verify(req.password.as_str(), &user.password_hash).map_err(|e| actix_web::error::ErrorInternalServerError(e))? {
        let token = if let Some(t) = user.token {
            t
        } else {
            let new_token = Uuid::new_v4();
            sqlx::query!(
                "UPDATE users SET token = $1 WHERE username = $2",
                new_token,
                req.username
            )
            .execute(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
            new_token
        };
        Ok(HttpResponse::Ok().json(AuthResponse { token }))
    } else {
        Err(actix_web::error::ErrorUnauthorized("Invalid credentials"))
    }
}
