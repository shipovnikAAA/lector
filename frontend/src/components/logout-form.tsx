export function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="ghost-button" type="submit">
        Logout
      </button>
    </form>
  );
}
