import { data } from "react-router";

// Index route of the root. Without it "/" would render the bare root layout
// with a 200, because the root route matches its own path.
export function loader(): never {
  throw data(null, { status: 404 });
}

// A route module needs a component; the loader always throws first.
export default function NotFound() {
  return null;
}
