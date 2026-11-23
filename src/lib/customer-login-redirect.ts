/** Only known customer destinations can be used after password sign-in. */
export function getCustomerLoginRedirect(destination: string | null): string {
  const destinations = ["/home", "/cart", "/checkout", "/profile", "/restaurants", "/explore"];
  return destination && destinations.includes(destination) ? destination : "/home";
}
