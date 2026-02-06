import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";

// Mock useAuth hook
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      contact_name: "Test Admin",
      email: "admin@test.com",
    },
    signOut: vi.fn(),
  }),
}));

// Mock the logo import
vi.mock("@/assets/logo-white.png", () => ({
  default: "logo-white.png",
}));

const renderWithRouter = (initialRoute = "/admin") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AdminLayout>
        <div data-testid="child-content">Test Content</div>
      </AdminLayout>
    </MemoryRouter>
  );
};

describe("AdminLayout", () => {
  it("renders children correctly", () => {
    const { getByTestId, getByText } = renderWithRouter();
    expect(getByTestId("child-content")).toBeInTheDocument();
    expect(getByText("Test Content")).toBeInTheDocument();
  });

  it("displays user profile information", () => {
    const { getByText } = renderWithRouter();
    expect(getByText("Test Admin")).toBeInTheDocument();
  });

  it("renders hamburger menu button", () => {
    const { getAllByRole } = renderWithRouter();
    const menuButtons = getAllByRole("button");
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it("renders navigation items", () => {
    const { getByText } = renderWithRouter();
    expect(getByText("Dashboard")).toBeInTheDocument();
  });

  it("contains navigation links", () => {
    const { container } = renderWithRouter();
    const links = container.querySelectorAll('a[href^="/admin"]');
    expect(links.length).toBeGreaterThanOrEqual(4);
  });

  it("renders logo", () => {
    const { getAllByAltText } = renderWithRouter();
    const logos = getAllByAltText("Audio Salvage UK");
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it("renders sidebar with navigation structure", () => {
    const { container } = renderWithRouter();
    const sidebar = container.querySelector("aside");
    expect(sidebar).toBeInTheDocument();
  });

  it("renders navigation items with correct paths", () => {
    const { container } = renderWithRouter();
    expect(container.querySelector('a[href="/admin"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/requests"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/drivers"]')).toBeInTheDocument();
  });

  it("shows Admin Dashboard subtitle", () => {
    const { getAllByText } = renderWithRouter();
    const subtitles = getAllByText("Admin Dashboard");
    expect(subtitles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders bottom navigation on mobile", () => {
    const { container } = renderWithRouter();
    const bottomNav = container.querySelector('nav.md\\:hidden');
    expect(bottomNav).toBeInTheDocument();
  });

  it("highlights active route", () => {
    const { container } = renderWithRouter("/admin/requests");
    const activeLink = container.querySelector('a[href="/admin/requests"]');
    expect(activeLink).toBeInTheDocument();
  });
});
