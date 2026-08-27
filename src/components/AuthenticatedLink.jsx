import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthenticatedLink({ to, children, ...props }) {
  const { isAuthenticated } = useAuth();

  return (
    <Link
      to={isAuthenticated ? to : "/giris"}
      state={isAuthenticated ? undefined : { from: to }}
      {...props}
    >
      {children}
    </Link>
  );
}
