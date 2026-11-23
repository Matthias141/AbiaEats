"use client";
export function SkipLink() {
  return <a href="#app-content" className="skip-link" onClick={event => {
    const target = document.querySelector<HTMLElement>("main") || document.getElementById("app-content");
    if (!target) return;
    event.preventDefault(); target.tabIndex = -1; target.focus(); target.scrollIntoView({ block: "start" });
  }}>Skip to main content</a>;
}
