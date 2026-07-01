import { cookies } from "next/headers";
import { verifyToken, SessionUser } from "../../lib/jwt";
import { ServiceResult } from "../../app/actions";

/**
 * Retreives and validates the HTTP-only suas_session cookie.
 * Returns the decoded SessionUser payload or null if unauthenticated.
 */
export async function getValidSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("suas_session")?.value;
    if (!sessionCookie) return null;

    return verifyToken(sessionCookie);
  } catch (e) {
    console.error("getValidSession error:", e);
    return null;
  }
}

/**
 * Server action authentication & authorization wrapper.
 * Ensures the user is logged in and belongs to one of the authorized designation roles.
 */
export async function withAuth<T>(
  requiredRoles: string[],
  action: (session: SessionUser) => Promise<ServiceResult>
): Promise<ServiceResult> {
  try {
    const session = await getValidSession();
    if (!session) {
      return { success: false, error: "Access Denied: Authentication required. Please log in." };
    }

    // Role-based Access Control checks
    // Standard role mappings based on designations: Director Admin, IT Admin, Lab Assistant etc.
    const userRole = session.role || session.designation;
    
    // Director Admin and Super Admin have global access override
    const hasRole = 
      userRole === "Director Admin" || 
      userRole === "Super Admin" || 
      requiredRoles.includes(userRole);

    if (!hasRole) {
      return { success: false, error: `Access Denied: Insufficient permissions. Required: [${requiredRoles.join(", ")}], Found: [${userRole}]` };
    }

    return await action(session);
  } catch (e: any) {
    console.error("withAuth wrapper error:", e);
    return { success: false, error: e.message || "An authorization failure occurred." };
  }
}
