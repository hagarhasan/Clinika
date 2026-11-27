const LAST_PUBLIC_LOCATION_KEY = "clinika:last-public-location";

export function rememberPublicLocation(location) {
  const path = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  if (location.pathname.startsWith("/") && !location.pathname.includes("-dashboard")) {
    sessionStorage.setItem(LAST_PUBLIC_LOCATION_KEY, path);
  }
}

export function getLogoutDestination(location) {
  if (!location.pathname.includes("-dashboard")) {
    return `${location.pathname}${location.search || ""}${location.hash || ""}`;
  }

  const previousLocation = sessionStorage.getItem(LAST_PUBLIC_LOCATION_KEY);
  if (previousLocation?.startsWith("/") && !previousLocation.startsWith("//")) {
    return previousLocation;
  }

  return "/";
}
