use std::time::{Duration, Instant};
use crate::models::AI_TOGGLE_COOLDOWN_SECS;

pub fn check_toggle_cooldown(
    cooldown_map: &dashmap::DashMap<String, Instant>,
    user_id: Option<&str>,
) -> Option<Duration> {
    let user_id = user_id?;
    let last = cooldown_map.get(user_id)?;
    let elapsed = last.elapsed();
    if elapsed.as_secs() < AI_TOGGLE_COOLDOWN_SECS {
        return Some(Duration::from_secs(AI_TOGGLE_COOLDOWN_SECS) - elapsed);
    }
    None
}

pub fn set_toggle_cooldown(cooldown_map: &dashmap::DashMap<String, Instant>, user_id: Option<&str>) {
    if let Some(uid) = user_id {
        cooldown_map.insert(uid.to_string(), Instant::now());
    }
}
